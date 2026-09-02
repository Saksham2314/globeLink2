# ADR 0009 — AI foundation: tools + extraction (Phase 6)

- **Status:** accepted
- **Date:** 2026-09-02

## Context

Phase 6 lays the plumbing the assistant will sit on, and ships one visible
feature: natural-language search on Explore. There is **no agent loop** yet — no
`/api/agent`, no `streamText`, no `/assistant` workspace, no `AgentSession`.
Those are Phases 7–8. The goal here is a tool contract and an extraction path
that later phases extend without rework, plus foundations that do not foreclose
the longer-term objectives (see "Future scope" below).

## Decisions

### 1. `src/ai/` calls services, never the database — enforced structurally

The architecture's core rule ("the AI never touches the DB directly") is now an
ESLint boundary: `src/ai/**` may not import `@/lib/db` or `@prisma/client`.
Persistence the AI layer needs — the `AgentToolCall` observability row — goes
through `src/modules/agent/agent-tool-call.service.ts` like any other domain
write. Tools import domain **services** (`searchJourneys`, `getPublicJourneyDetail`);
those remain the only place Prisma is used.

### 2. The tool factory and its result contract

`defineTool({ name, description, input: ZodObject.strict(), kind, confirm?, handler })`
returns a `Tool` whose `run(rawArgs, ctx)`:

1. `safeParse`s args against the strict schema — unknown keys and out-of-bounds
   values are rejected as `BAD_ARGS` before the handler runs.
2. For a `mutate` + `confirm` tool, returns `NEEDS_CONFIRMATION` **without
   executing** — the confirmation-token flow itself is Phase 8, so these tools
   are registered (their schemas designed) but inert.
3. Runs the handler with `ctx = { userId, role? }` — the agent acts **as the
   user, never elevated**; read tools scope to visible data, mutate tools
   re-check ownership in the service.
4. Normalizes the outcome to `{ ok: true, data } | { ok: false, error: { code, message } }`.
   An exposed `AppError` keeps its code; anything else is masked as `INTERNAL`.
5. Writes one `AgentToolCall` row (args, result, status, `latencyMs`). `run`
   never throws.

The factory produces our own shape, not an AI SDK `tool()`. Phase 7 adds a thin
adapter; the SDK coupling stays in one place.

### 3. Two read tools now; the rest specified in the registry

`searchJourneys` (wraps `modules/search`) and `getJourney` (wraps a new
`getPublicJourneyDetail` that resolves slug **or** id and applies the same
draft-visibility rule as `getPublicJourney`) are implemented. `getUserPreferences`,
`getSavedJourneys`, `getItineraryContext`, `saveJourney`, `createItinerary`,
`updateItinerary`, `sendMessage` are listed in `PLANNED_TOOLS` with their kind
and confirmation requirement so the shape is settled. Nothing outside
`IMPLEMENTED_TOOLS` is callable.

Money crosses the tool boundary in **major** units (`{ amount, currency }`) — the
DB stores minor units, but that is how the model and the user talk about cost.
`getJourney` returns the journey in full (day-by-day stops with locations and
costs, tips, budget) so a future flow can mine community journeys for building
itineraries.

### 4. `AgentToolCall` table

Columns per the architecture doc plus a nullable `userId` (FK, `SetNull`) for
Phase 6 observability while there are no sessions. `sessionId` / `messageId`
stay null until Phase 7's `AgentSession` / `AgentMessage` land (they add the
FKs). The hand-written migration strips the recurring spurious
`DROP INDEX journeys_search_idx` / `ALTER COLUMN searchVector DROP DEFAULT`
lines that `migrate diff` emits for the `Unsupported("tsvector")` column.

Migration history note: `_prisma_migrations` did not exist on the database
(earlier phases were applied without it). The six prior migrations were
baselined with `migrate resolve --applied` (they already matched the live
schema); `20260902180000_ai_foundation` is the first tracked `migrate deploy`.

### 5. Constraint extraction — tolerant, model-agnostic, cheap

`extractTravelConstraints(text)` runs a `generateObject` call on **Claude Haiku
4.5** against a _permissive_ schema (`rawExtractionSchema`), then
`sanitizeConstraints` narrows the result to the canonical `TravelConstraints`:
out-of-vocabulary styles are dropped, bad enums/months nulled, numbers clamped
or nulled — never fabricated. A strict schema made `generateObject` throw away
otherwise-good output when the model invented e.g. `styles: ["beach"]`.

`TravelConstraints` is deliberately a **reusable** shape. Phase 6 fills it from
a phrase (`fromMessage`); a future `fromItinerary(itinerary)` produces the same
type for itinerary-aware discovery. The value is never persisted.

The call is gated three ways: `isAiEnabled` (no `ANTHROPIC_API_KEY` → returns
null), a heuristic (`looksLikeNaturalLanguageQuery` — a bare keyword skips the
model), and a try/catch that falls back to text search on any failure. Tokens
and latency are logged per call.

### 6. Explore natural-language search

`ExploreNlSearch` (a box above the filters) submits to `interpretSearchAction`,
which: bails to `?q=<text>` for short queries; else extracts, maps via
`travelConstraintsToSearchParams` onto the **visible, editable** URL filter
params, and returns a one-line "Interpreted as …" summary with a "search exact
text instead" escape hatch. `constraintsToSearchParams` is kept separate from
any future ranking helper so itinerary-derived personalization can influence
ordering without writing private details into a shareable URL. `month` is
extracted but **not** mapped — journeys have no month filter yet.

The composition lives in `search.actions.ts` (transport); `search.service.ts`
never imports AI.

## Future scope this phase must not foreclose

Recorded so later phases inherit the reasoning, not just the code. **None of
this is built in Phase 6.**

- **Itinerary-aware Explore** — personalized ranking of _public_ journeys from
  the user's _private_ itinerary context. Seam: `TravelConstraints` +
  `fromItinerary`; a `relevantJourneys(constraints, { viewerId })` ranking
  helper distinct from the URL mapper; private data stays owner-scoped and
  server-side.
- **Journey → itinerary intelligence** — retrieve relevant journeys, mine
  destinations/stops/costs/tips, propose or update a private itinerary through
  the existing itineraries services. Seam: `getJourney` returns full structure;
  itinerary services already exist; `forkFromJourney` is the one-click base.
- **RAG knowledge base** — published journey → chunk → embed → vector store →
  semantic retrieval → LLM context, incrementally updated on publish/update.
  The retrieval seam is the `searchJourneys` tool (FTS today, hybrid FTS +
  `pgvector` later — same signature). `pgvector` is expected to extend the
  existing Neon database, not add a store. Indexing hook = the journey
  service's publish/update path. The LLM is never retrained on journeys.
- **Agent chatbot** — Phases 7–8. The factory output is built to be wrapped by
  the AI SDK `tool()`; the registry already enumerates the full tool set.

## Consequences

- New: `src/ai/` (`provider`, `tools/*`, `extraction/*`), `src/modules/agent/`
  (`agent-tool-call.service`). `ai` + `@ai-sdk/anthropic` added (v5 line, for a
  stable API surface).
- `env.ts` gains optional `ANTHROPIC_API_KEY` + `isAiEnabled`.
- ESLint: `src/ai/**` Prisma-import ban. Vitest: `server-only` aliased to a
  no-op stub; `LOG_LEVEL` defaulted in the test setup.
- Explore grows a natural-language search box; `search.actions.ts` composes AI +
  search; `journey.service.ts` gains `getPublicJourneyDetail`.
- New model `AgentToolCall` + enum `AgentToolCallStatus`; migration
  `20260902180000_ai_foundation`.
