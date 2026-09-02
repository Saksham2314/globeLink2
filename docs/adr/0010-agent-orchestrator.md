# ADR 0010 — Agent orchestrator + workspace (Phase 7)

- **Status:** accepted
- **Date:** 2026-09-02

## Context

Phase 6 built the tool contract and constraint extraction. Phase 7 makes them
usable: a streaming tool-calling loop behind `POST /api/agent`, persisted
`AgentSession` / `AgentMessage`, and the `/assistant` workspace. The agent can
**search and read** journeys and explain them — it cannot yet save, create,
fork, or message (mutating tools + the confirmation flow are Phase 8).

Locked decisions: Haiku 4.5 for the loop; a preview-only two-column canvas;
per-user requests/min + `maxSteps` cap + per-turn timeout; Node runtime; AI SDK
v5 `useChat` + `toUIMessageStreamResponse`; windowed history with simple
overflow summarization.

## Decisions

### 1. Data model

`AgentSession` (`userId`, auto-generated `title`, `state` jsonb working memory,
`summary` rolling text, `status`, `lastActivityAt`) and `AgentMessage`
(`sessionId`, `role` USER/ASSISTANT, `parts` jsonb **stored exactly as the AI
SDK produces it** so a session replays and renders verbatim). The Phase 6
`AgentToolCall.sessionId` / `messageId` columns gain their FKs now:
`sessionId → AgentSession` (`SetNull`, keep the analytics trail),
`messageId → AgentMessage` (`SetNull`). `messageId` stays null in Phase 7 —
tool calls are logged mid-stream, before the assistant message is persisted;
`sessionId` is populated via `ToolContext.sessionId`. `AgentMessageRole` has
only USER and ASSISTANT: the SDK models tool calls/results as *parts* inside an
assistant message, not separate messages.

### 2. The orchestrator

`streamAgentReply({ uiMessages, summary, ctx })` in `src/ai/agent/` assembles
the context — system prompt (+ rolling summary) + the windowed recent history +
the new user message — and calls `streamText` with:

- `getAgentModel()` (Haiku 4.5, its own `AGENT_MODEL_ID` constant so switching
  to Sonnet is one line),
- the tools from a thin adapter (`buildAgentTools`) that wraps each Phase 6
  `Tool` as an AI SDK `tool()` whose `execute` just calls `tool.run` — so
  validation, authorization, `AgentToolCall` logging and the
  `{ok,data}|{ok,error}` normalization already happen there and the model can
  recover from a tool error itself,
- `stopWhen: stepCountIs(6)` — hard cap on model↔tool round-trips,
- `abortSignal: AbortSignal.timeout(55_000)` — under the ~60s Vercel ceiling,
- `onStepFinish` structured logging (tools used, tokens, finish reason).

It returns the `streamText` result; the route pipes it to the client and
persists in `onFinish`. `src/ai` still never imports Prisma
(ESLint-enforced) — persistence goes through `src/modules/agent`.

### 3. Context window: fixed count + overflow summary

`windowMessages` keeps the last 20 messages verbatim. Once a session passes 30
messages, `refreshSummary` folds the overflow into `AgentSession.summary` with
one cheap Haiku `generateText` call, merged with the previous summary. Simple on
purpose — small model, short function window; token-precise budgeting can come
later if it matters.

### 4. `POST /api/agent`

Node runtime, `maxDuration = 60`. Order: `auth()` → 401; AI disabled → 503;
per-user rate limit (in-memory sliding 60s window, 12/min — resets on cold
start, acceptable for a soft limit; the tokens/day budget is Phase 9) → 429;
parse `{ sessionId, message }` (the client transport sends only the new message
+ session id, the server loads the rest) → 400; `getOwnedSession` → 404/403.
Then `streamAgentReply` and `result.toUIMessageStreamResponse({ originalMessages,
onFinish, onError })`. `onFinish` appends the turn's new messages, refreshes the
summary when due, and generates the session title on the first turn. `onError`
returns a calm "the assistant had trouble" string and logs.

### 5. `/assistant` workspace — preview only

`/assistant` redirects to the newest session (creating one if none);
`/assistant/[sessionId]` is the workspace, keyed by id so switching sessions
remounts `useChat`. Three columns on `lg` (session list · conversation ·
canvas), two on `md`, one below. The client `DefaultChatTransport` overrides
`prepareSendMessagesRequest` to post `{ sessionId, message: <last> }` only.

- **Conversation**: user bubbles; assistant text as sanitized markdown; every
  tool call renders a `ToolStatusChip` ("Searching journeys…" → "Searched
  journeys · 6 results" / "… failed"), expandable to raw args/output.
- **Canvas**: reads the latest successful tool result across the transcript. A
  `searchJourneys` result renders the model's chosen constraints as chips plus
  compact journey cards; a `getJourney` result renders a day-by-day preview.
  Every card links out to `/journeys/[slug]` in a new tab — **nothing on the
  canvas mutates** in Phase 7.
- **Session list**: new chat, inline rename, two-step delete; auto-generated
  titles.

Nav: "Assistant" added to the header and the user menu; `/assistant` joins the
sign-in-gated prefixes.

## Testing

- Unit (mock model / pure): `context-window` windowing + summary trigger +
  flattening; `agent.schema` request/rename validation; `to-ai-sdk-tool`
  adapter shape and delegation; `orchestrator` with `MockLanguageModelV2` —
  streams the reply, passes system prompt + windowed history, advertises both
  read tools, returns a valid UI-message-stream `Response`.
- E2E (`scratchpad`, real Haiku): one full turn — the model calls
  `searchJourneys`, the loop stays within the step cap, the tool call is logged
  and linked to the session, the transcript persists in order, a title is
  generated, `finalizeTurn` writes state, and a non-owner's `getOwnedSession`
  throws. HTTP smoke: `/assistant` gating + redirect + 404, `POST /api/agent`
  401 unauthed and a real authed streaming round-trip that persists.

## Consequences

- New: `src/ai/agent/` (`system-prompt`, `context-window`, `to-ai-sdk-tool`,
  `title`, `summary`, `orchestrator`), `src/modules/agent/`
  (`agent.schema`, `agent.mappers`, `agent-session.service`,
  `agent-message.service`, `agent.actions`), `src/app/api/agent/route.ts`,
  `/assistant` routes, `src/components/globe/assistant/*`.
- `@ai-sdk/react` added; `provider.ts` gains `getAgentModel`; `ToolContext`
  gains `sessionId`, threaded into `AgentToolCall`.
- Migration `20260902200000_agent_sessions` (CREATE + ADD CONSTRAINT only).
- Not built: mutating tools, the confirmation-token flow, an editable
  itinerary-draft canvas, `AuditLog`, per-tool rate caps, a tokens/day budget.
