# ADR 0012 — AI evaluation & observability (Phase 9)

- **Status:** accepted
- **Date:** 2026-09-02

## Context

Phases 6–8 built the assistant: extraction, the tool-calling loop, mutating
tools with confirmation. Phase 9 adds the means to **measure** it and **watch**
it in production. Locked decisions: an `AgentRun` table (one row per turn) via a
single additive migration; an eval CI workflow that is informational, not a
merge gate; Sentry, inert until a DSN is set; three eval suites (extraction,
tool-selection, end-to-end with an LLM judge); a `npm run eval` runner; a
per-user tokens/day budget enforced before streaming; a read-only "Assistant
activity" list in Settings from `AuditLog` + `AgentRun`.

## Decisions

### 1. `AgentRun` — one row per assistant turn

`AgentRun` (`sessionId?`, `userId?`, `model`, `inputTokens`, `outputTokens`,
`totalTokens`, `steps`, `toolNames[]`, `latencyMs`, `outcome`, `error?`) is the
structured per-run record from the architecture doc. It complements the two
existing tables: `AgentToolCall` is per **invocation**, `AuditLog` is per **data
change**, `AgentRun` is per **turn**. Both FKs are `SetNull` so a deleted
session or user never deletes the metrics. Migration `20260902260000_agent_run`
is `CREATE TYPE` + `CREATE TABLE` + two indexes + two FKs — additive only,
applied with `prisma migrate deploy`.

`recordAgentRun` (in `src/modules/agent/agent-run.service.ts`) is best-effort,
mirroring `recordAgentToolCall`: a write failure is logged, never thrown.

### 2. The route reports the run; `src/ai` stays DB-free

The eslint boundary forbids `src/ai` importing `@/lib/db` or `@prisma/client`.
So the orchestrator gained an `onComplete(stats)` callback fired once per turn
(from `streamText`'s `onFinish` / `onError`) carrying `{ outcome, model,
inputTokens, outputTokens, totalTokens, steps, toolNames, error }`. The route
supplies the callback and does the `recordAgentRun` write, measuring wall-clock
latency itself. `outcome` is `OK`, `ERROR`, `TIMEOUT` (abort signal) or
`RATE_LIMITED` (budget).

### 3. Tokens/day budget

`DAILY_TOKEN_BUDGET` = 200 000 tokens per user over a rolling 24 h — dozens of
turns, so it only catches runaway or abusive use. Checked **before streaming**
via `getTokensUsedToday` (a `SUM(totalTokens)` over the last day); over budget →
`429` and a `RATE_LIMITED` `AgentRun` row for visibility. The query is
**fail-open**: any error returns 0 so a metering hiccup never locks a user out.
This is the persistent counterpart to the pre-existing in-memory
requests/minute limit.

### 4. Evals — `src/ai/evals/`, real model, not vitest

Evals call a real model, cost money and vary run to run, so they live in
`*.eval.ts` files (excluded from the vitest glob) and run via
`npm run eval` (`tsx --conditions=react-server`, so `server-only` no-ops). Only
the pure scoring helpers in `types.ts` are unit-tested (`scoring.test.ts`).

| Suite            | What it measures                | How                                                                                                                                                                                                  |
| ---------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extraction`     | utterance → `TravelConstraints` | field-by-field scoring (`setEqual` for styles, loose text otherwise); a case passes at ≥ 0.75                                                                                                        |
| `tool-selection` | prompt → the right tool         | real model + real tool **schemas**, `execute` stubbed with canned data, ≤ 3 steps; pass if the expected tool was called                                                                              |
| `e2e-llm-judge`  | final reply quality             | agent loop over stubbed tools (confirm tools have **no** execute, mirroring the real loop), then a Haiku judge scores helpfulness + tone 1–5 on a three-line format parsed by regex; pass at avg ≥ 4 |

`run.ts` runs the suites sequentially, prints a table and writes
`src/ai/evals/report.json` (pass rate per suite + overall). The runner exits
non-zero only on a harness failure — **a low pass rate is not a failure**, it is
tracked signal. Baseline at introduction: ~89% overall.

A surfaced improvement was folded back in: the extraction sanitizer now maps
model sentinel strings (`<UNKNOWN>`, `n/a`, `none`, …) to `null`, which is what
the "uncertain stays null" contract always intended.

### 5. Eval CI — informational

`.github/workflows/ai-evals.yml` runs on a weekly cron, on PRs touching
`src/ai/**`, and on demand. It runs `npm run eval`, uploads `report.json` as an
artifact, and on non-PR runs commits the refreshed report. `continue-on-error:
true` and it is not a required check — it never blocks a merge. Needs an
`ANTHROPIC_API_KEY` repo secret; with none it skips the run.

### 6. Sentry — inert until `NEXT_PUBLIC_SENTRY_DSN` is set

`@sentry/nextjs` is a dependency, but with no DSN it must cost nothing. The DSN
is a single **public** env var (it is not a secret), inlined at build time, so:

- `next.config.ts` applies `withSentryConfig` **only** when the DSN is set —
  otherwise the build is byte-for-byte what it was.
- `instrumentation.ts` / `instrumentation-client.ts` guard every
  `import("@sentry/nextjs")` behind `if (process.env.NEXT_PUBLIC_SENTRY_DSN)`;
  an unset build dead-code-eliminates them, so the Sentry SDK never enters the
  client bundle (shared JS stays at 103 kB).
- The agent route's stream-error handler reports via a guarded dynamic import.

Having an `instrumentation.ts` at all pulls the Next OpenTelemetry bridge into
the edge middleware bundle (~85 kB → ~173 kB). That is a Next baseline cost of
the instrumentation hook, not Sentry, and it is the price of the phase's
"reading traces" goal.

### 7. Assistant activity in Settings — read-only

`getAssistantActivity(userId)` merges the user's recent `AuditLog` rows ("Saved
a journey", …) with recent `AgentRun` rows ("Assistant turn · 1,240 tokens · 2
steps · searchJourneys") into one time-ordered list. `<AssistantActivity>`
renders it on `/settings`. No controls, no admin surface — a user only ever sees
their own rows.

## Consequences

- New: `AgentRun` model + migration `20260902260000_agent_run`;
  `src/modules/agent/{agent-run,activity}.service.ts`; `src/ai/evals/*`;
  `<AssistantActivity>`; `sentry.*.config.ts`, `src/instrumentation*.ts`;
  `.github/workflows/ai-evals.yml`; `npm run eval`.
- Changed: `orchestrator.streamAgentReply` gains `onComplete`; `/api/agent`
  enforces the token budget and writes `AgentRun`; `constraints.schema`
  null-maps sentinel strings; `env.ts` adds `NEXT_PUBLIC_SENTRY_DSN`;
  `next.config.ts` conditionally wraps with Sentry.
- Manual, one-time: add `ANTHROPIC_API_KEY` as a GitHub Actions secret for the
  eval workflow; set `NEXT_PUBLIC_SENTRY_DSN` (and optionally
  `SENTRY_AUTH_TOKEN`) in Vercel to turn on error tracking.
- Not built: alerting/thresholds on the eval report, a seeded-DB e2e variant,
  OpenTelemetry export, per-run cost in currency, an admin dashboard.
