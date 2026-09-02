# ADR 0011 — Mutating tools + user-confirmed execution (Phase 8)

- **Status:** accepted
- **Date:** 2026-09-02

## Context

Phases 6–7 made the assistant read-only. Phase 8 lets it change the user's data
— save a journey, create/update an itinerary, send a message — with every
change gated by an explicit user confirmation and recorded in an audit trail.
Locked decisions: user-click server action (not an HMAC token), all four tools
including `sendMessage`, `saveJourney` stays inline/no-confirm, `AuditLog` is
table + write path only, per-session and per-tool caps, interactive canvas
buttons, existing domain services stay the source of truth and keep their
service-layer authorization.

## Decisions

### 1. The confirmation flow is a human-in-the-loop, not a token

`defineTool` gained `execute()` alongside `run()`:

- `run(args, ctx)` — validate args → if `mutate && confirm`, return
  `NEEDS_CONFIRMATION` **without invoking the handler** → otherwise run it.
- `execute(args, ctx)` — validate args → run the handler, **skipping the
  confirmation gate**. The caller vouches that confirmation happened.

`buildAgentTools` registers confirm tools (`createItinerary`, `updateItinerary`,
`sendMessage`) with **no `execute`**, so when the model calls one the tool part
stays `input-available` and the loop stops there. `<ConfirmationCard>` renders
that part — for `sendMessage` it shows the **exact** message text verbatim.

**Confirm** calls `confirmMutationAction({ sessionId, messageId, toolCallId,
toolName, input })`:

1. `auth()` — the click is an authenticated request; that *is* the
   authorization.
2. `getOwnedSession(userId, sessionId)` — the user owns this conversation.
3. `tool.execute(input, { userId, sessionId })` — which re-validates args,
   re-checks resource ownership **inside the domain service** (`loadOwned` /
   `assertOwnership` / `assertParticipant`), enforces the rate caps, calls the
   service, and writes the `AuditLog` row.
4. `resolveToolCallInMessage(...)` — patch the persisted `AgentMessage` so its
   stored tool part becomes `output-available`; otherwise a page reload would
   show the card as still pending.

`addToolResult` feeds the outcome into the live `useChat` transcript. The
model is **not** auto-resumed — the card itself shows the result (✓ / link /
cancelled / error), which avoids an extra model round-trip and needs no
assistant-role resume path in `/api/agent`. **Cancel** patches the stored part
to `{ status: "cancelled" }` and adds the same to the live transcript.

No token, no `PendingToolCall` table, no TTL to reason about — the security
boundary is the authenticated server action plus the unchanged service-layer
ownership checks.

### 2. Four tools, wrapping existing services

| Tool | Confirm | Service |
| --- | --- | --- |
| `saveJourney(slug)` | no — one reversible tap, runs inline in the loop | `saved.toggleSave` |
| `createItinerary(title, fromJourneySlug? / destination? / days?)` | yes | `createItinerary` / `forkFromJourney` (+ `replacePlan`) |
| `updateItinerary(itinerary, …changes)` | yes — resolves an id, or the exact/partial title via `listMine` | `updateMeta` / `updateStatus` / `replacePlan` |
| `sendMessage(body, journeySlug? / recipientHandle?)` | always | `getOrCreateConversation` + `sendMessage` |

`updateMeta` was changed to take `unknown` (it re-parses with its schema, like
`replacePlan`) so the tool can pass a merged current-plus-patch object without a
type fight. New service helpers: `journeys.getPublishedJourneyRef` (slug/id →
id + author) and `users.getUserIdByHandle`.

The read helpers `getUserPreferences` / `getSavedJourneys` / `getItineraryContext`
stay in `PLANNED_TOOLS` — not needed for Phase 8.

### 3. `AuditLog` + rate caps

`AuditLog` (`userId, sessionId?, action, targetType, targetId, summary`) gets one
row per successful mutation — including the inline `saveJourney` and the canvas
Save button. It is distinct from `AgentToolCall` (per-invocation observability):
this is "what changed", and it also backs the caps.

`assertMutationAllowed({ userId, sessionId, action })`, called at the top of
every mutating handler, throws `RATE_LIMITED` (which the tool factory turns into
a normal `{ ok: false, error }` the model relays) when:

- the session already has `MAX_MUTATIONS_PER_SESSION` (20) audit rows, or
- the user has hit a per-tool 24h cap — `DAILY_TOOL_CAP` = `{ sendMessage: 8 }`.

No settings/admin UI this phase.

### 4. Interactive canvas

Canvas journey cards get **Open** (new tab), **Save** (toggles via
`assistantSaveJourneyAction`, audited), and **Plan from this** (reuses the
Phase-5 `forkJourneyAction`). All user-initiated.

## Consequences

- New: `src/ai/tools/{save-journey,create-itinerary,update-itinerary,send-message}.tool.ts`,
  `src/modules/agent/audit.service.ts`, `<ConfirmationCard>`. `defineTool`
  refactored (`run` + `execute`). `agent.actions.ts` gains
  `confirmMutationAction` / `cancelMutationAction` / `assistantSaveJourneyAction`;
  `agent-message.service.ts` gains `resolveToolCallInMessage`.
- Migration `20260902240000_audit_log` — `CREATE TABLE` + indexes + FK only.
- The tool set advertised to the model grows from 2 to 6; the system prompt now
  describes the action tools and the confirm-once rule.
- Not built: an editable itinerary-draft canvas, an "Assistant activity" view,
  a tokens/day budget, the read helper tools.
