# GlobeLink — Technical Architecture Proposal

> Status: **Proposal, for review.** No application code has been written.
> Author: engineering copilot session, 2026-09-01.
> This document is the reference for the rebuild. Every major decision below has a rationale, alternatives, and tradeoffs so it can be defended in an interview.

---

## 0. Guiding constraints (from the product brief)

1. GlobeLink is a **travel platform first**; the AI agent is an intelligent layer _over_ the application, not the product.
2. The AI **never touches the database directly** — it acts only through validated, authorized tools that call application services.
3. One unified user model — any user can publish, discover, save, message, plan, and use the AI.
4. Relational data, PostgreSQL. No vector DB / RAG unless a concrete product need appears.
5. Production-shaped from day one (env, validation, errors, logging, auth, migrations, CI) — but built incrementally, not all at once.
6. Premium, editorial, restrained UI. Not a CRUD dashboard, not a chatbot clone.
7. The developer wants to **understand every layer**. No black-box generation, minimal boilerplate, cohesive modules.

---

## 1. Recommended technology stack

| Concern            | Recommendation                                                               | One-line reason                                                                         |
| ------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Language           | **TypeScript** everywhere                                                    | One language, shared types across UI / API / AI tools                                   |
| App framework      | **Next.js 15 (App Router)** full-stack                                       | SSR/ISR for discoverable content + built-in API + streaming for AI                      |
| UI runtime         | **React 19** (Server + Client Components)                                    | Server components remove most data-fetching plumbing                                    |
| Styling            | **Tailwind CSS v4** + design tokens                                          | Fast, consistent, token-driven; no runtime cost                                         |
| Component base     | **shadcn/ui** (Radix primitives, copied in)                                  | Accessible primitives we own and restyle; not a themed library lock-in                  |
| Motion             | **Framer Motion** (`motion/react`), used sparingly                           | Restrained, accessible transitions                                                      |
| Database           | **PostgreSQL**, managed on **Neon**                                          | Relational fit, constraints, transactions, FTS, branch-per-PR, pgvector later if needed |
| ORM                | **Prisma**                                                                   | Best-in-class type-safety + migrations + readable schema for a solo dev                 |
| Auth               | **Better Auth** (email/password + Google OAuth, DB sessions)                 | Own your data, understandable, batteries included; Auth.js v5 is the fallback           |
| AI SDK             | **Vercel AI SDK (`ai`)** + **Anthropic Claude** provider                     | Unified streaming + tool-calling loop + structured output + React hooks                 |
| Validation         | **Zod** (input, env, AI tool schemas, forms)                                 | One schema language; Zod → JSON Schema for tools                                        |
| File/image storage | **Cloudflare R2** (S3-compatible, zero egress) or UploadThing                | Cheap, standard, `next/image` friendly                                                  |
| Testing            | **Vitest** (unit/integration) + **Playwright** (E2E) + small AI eval harness | Fast, ESM-native; E2E only on critical flows                                            |
| Rate limit / cache | **Upstash Redis** (prod), in-memory (dev)                                    | Serverless HTTP Redis, free tier                                                        |
| Error tracking     | **Sentry** free tier                                                         | Exceptions + agent-run incidents                                                        |
| Hosting            | **Vercel** (app) + **Neon** (DB) + **R2** (files)                            | All have real free tiers; Next.js-native deploy                                         |
| CI/CD              | **GitHub Actions** + Vercel preview deploys + Neon branch per PR             | Typecheck / lint / test / migrate-check gates                                           |

### Rationale and alternatives for the major choices

**Next.js full-stack (vs. Next.js + separate NestJS/Express backend)**

- _Why it fits:_ The public surfaces (landing, explore, journey details) need SSR/ISR for SEO and social cards. Next.js gives server components, route handlers for the AI streaming endpoint, and server actions for mutations — one repo, one deploy, one type system. Iteration speed matters for a solo build.
- _Alternatives:_ A dedicated backend gives cleaner separation and independent scaling, but doubles deploy/ops surface and needs a shared types package. Vite SPA + Express loses SSR. Remix is comparable but has less AI-tooling momentum.
- _Tradeoff:_ UI and API deploy together; long-running agent loops don't fit serverless well. Mitigated by a strict service layer (cheap to extract later) and by capping agent steps. Add a queue/worker (Inngest / Trigger.dev free tier) only when agent runs actually get long.

**PostgreSQL on Neon (vs. Supabase / PlanetScale / Mongo)**

- _Why:_ Travel data is highly relational and benefits from constraints and transactions. Neon has a genuine free tier and **database branching**, so each PR/preview gets an isolated DB. pgvector is available if semantic search is later justified.
- _Alternatives:_ Supabase bundles auth+storage+realtime (useful, but more surface than we need and its auth couples us tighter); PlanetScale is MySQL with historically no FKs and no pgvector; MongoDB invites schema drift for structured itineraries — a poor fit.

**Prisma (vs. Drizzle)**

- _Why:_ The developer wants to _understand the schema_. Prisma's schema file is the most readable single source of truth, and its migration workflow is hard to beat.
- _Tradeoff:_ Heavier client, historically slower serverless cold starts. Neon's pooler + Prisma `directUrl` handles this. **Drizzle is the documented escape hatch** if cold starts ever hurt — it is closer to SQL and lighter.

**Better Auth (vs. Auth.js v5 / Clerk / Lucia)**

- _Why:_ Matches the "own your data + understand it" philosophy. TypeScript-native, email/password + OAuth + revocable DB sessions + optional 2FA, with a Prisma adapter.
- _Alternatives:_ Clerk is fastest to ship but is a hosted black box (conflicts with the learning goal and adds lock-in); Auth.js v5 is the standard but its credentials provider is deliberately bare and v5 still has rough edges; Lucia is deprecated.
- _Risk:_ Better Auth is young. The `modules/auth` boundary keeps a swap to Auth.js v5 or Clerk localized.

**Vercel AI SDK + Claude (vs. raw Anthropic SDK / LangChain / LlamaIndex)**

- _Why:_ The AI SDK's tool-calling loop maps exactly onto the "controlled tools" requirement, gives streaming, `generateObject` for constraint extraction, and `useChat`/`useObject` React hooks so the workspace UI renders structured output instead of markdown. Provider-swappable.
- _Alternatives:_ Raw Anthropic SDK — more control, more plumbing; adopt only if the abstraction leaks. **LangChain / LangGraph — explicitly not recommended**: heavy abstraction with no payoff at this scale. LlamaIndex is RAG-focused and not needed.

**Explicitly NOT adding now:** vector database, RAG pipeline, agent frameworks, message queue, microservices, GraphQL, a design-component library, websockets. Each has a concrete trigger documented in the roadmap for when (if) it earns its place.

---

## 2. Repository architecture

**Recommendation: a single Next.js application repository, organized by feature modules. Not a monorepo.**

- _Why not a monorepo:_ There is exactly one deployable and no packages shared across multiple apps. Turborepo / pnpm workspaces would add configuration and cognitive overhead for zero benefit today.
- _When to revisit:_ The moment a second consumer appears — a mobile app, a standalone worker/queue service, a public SDK. The `src/modules/*` service layer is designed so that extraction is mechanical.

```
globelink/
├── .github/workflows/          # ci.yml, ai-evals.yml (scheduled), backup.yml
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── e2e/                         # Playwright specs (critical flows only)
├── docs/
│   ├── ARCHITECTURE.md          # this document
│   └── adr/                     # short Architecture Decision Records
├── public/
├── src/
│   ├── app/                     # ROUTING + COMPOSITION ONLY — no business logic
│   │   ├── (marketing)/         # landing, about
│   │   ├── (app)/               # authenticated shell
│   │   │   ├── explore/
│   │   │   ├── journeys/[slug]/         (+ /new, /[slug]/edit)
│   │   │   ├── profile/[handle]/
│   │   │   ├── saved/
│   │   │   ├── messages/
│   │   │   ├── itineraries/[id]/
│   │   │   └── assistant/               # AI travel workspace
│   │   ├── api/
│   │   │   ├── agent/route.ts           # streaming agent endpoint
│   │   │   ├── health/route.ts
│   │   │   └── webhooks/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── modules/                 # THE CORE — one folder per domain
│   │   ├── users/
│   │   ├── journeys/
│   │   │   ├── journey.service.ts       # business logic + authorization; ONLY place Prisma is touched
│   │   │   ├── journey.schema.ts        # Zod: create/update/query DTOs
│   │   │   ├── journey.actions.ts       # server actions -> call the service
│   │   │   ├── journey.mappers.ts       # DB row -> API/UI DTO (strips private fields)
│   │   │   └── journey.types.ts
│   │   ├── itineraries/
│   │   ├── saved/
│   │   ├── messaging/
│   │   └── search/
│   ├── ai/                      # AI LAYER — isolated; never imports Prisma
│   │   ├── agent/
│   │   │   ├── orchestrator.ts          # the bounded tool-calling loop
│   │   │   ├── system-prompt.ts
│   │   │   └── context.ts               # history window + summary + session state
│   │   ├── tools/
│   │   │   ├── define-tool.ts           # factory: schema + authz + logging + result contract
│   │   │   ├── registry.ts              # name -> tool; filtered by permissions/flags
│   │   │   ├── search-journeys.tool.ts
│   │   │   └── get-journey.tool.ts
│   │   ├── extraction/                  # generateObject constraint extraction
│   │   └── evals/
│   ├── components/
│   │   ├── ui/                  # shadcn primitives, restyled to tokens
│   │   └── globe/              # composed: JourneyCard, StatRow, ItineraryTimeline, ...
│   ├── lib/
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── auth.ts            # Better Auth config
│   │   ├── env.ts             # Zod-validated environment
│   │   ├── logger.ts         # structured logging (request id, agent run id)
│   │   ├── errors.ts        # typed AppError -> HTTP status mapping
│   │   ├── rate-limit.ts
│   │   └── authz.ts        # assertCan(user, action, resource)
│   ├── styles/            # design tokens
│   └── test/            # setup, factories, fixtures
├── .env.example
├── next.config.ts       # security headers, image domains
└── (tsconfig, tailwind, eslint, prettier, vitest configs)
```

**The one rule that enforces the brief:** `src/app/` is transport and composition only. All business logic lives in `src/modules/*/**.service.ts`. **Prisma is imported by services only.** The `src/ai/` layer calls services (via the tool factory), never the database. This makes "the AI cannot touch the DB" a structural property, not a promise.

---

## 3. System architecture

```
                 ┌───────────────────────────────────────────────┐
                 │  Browser (React Server + Client Components)    │
                 └───────────────┬───────────────────────────────┘
        reads (RSC call service) │ mutations (server action)   │ AI (fetch stream)
                 ┌───────────────▼───────────────┐  ┌──────────▼───────────────┐
                 │  app/ actions + route handlers │  │  app/api/agent/route.ts  │
                 │  auth gate · Zod validate ·    │  │  auth · rate-limit ·     │
                 │  rate-limit · shape response   │  │  load session · stream   │
                 └───────────────┬───────────────┘  └──────────┬───────────────┘
                                 │                             │
                                 │                  ┌──────────▼───────────────┐
                                 │                  │  AI Orchestrator (ai/)   │
                                 │                  │  Claude + tool loop      │
                                 │                  │  maxSteps · context      │
                                 │                  └──────────┬───────────────┘
                                 │                             │ validated tool call
                                 │                  ┌──────────▼───────────────┐
                                 │                  │  Tool wrapper (ai/tools) │
                                 │                  │  Zod args · authz(user)  │
                                 │                  │  confirm gate · logging  │
                                 │                  └──────────┬───────────────┘
                 ┌───────────────▼─────────────────────────────▼───────────────┐
                 │            Domain Services (modules/*/service.ts)            │
                 │  business rules · resource-level authorization · txns       │
                 └───────────────┬───────────────────────────────┬─────────────┘
                                 │ Prisma                        │ wrapped clients
                 ┌───────────────▼──────────────┐   ┌────────────▼─────────────┐
                 │  PostgreSQL (Neon)           │   │  External APIs           │
                 │  source of truth · FTS       │   │  Anthropic · R2 · Resend │
                 └──────────────────────────────┘   └──────────────────────────┘
```

**Layer responsibilities**

1. **UI** — Server Components read data by calling services directly (no HTTP self-call). Client Components handle interactivity and call Server Actions for mutations and the `/api/agent` route for AI. Loading / empty / error states are first-class.
2. **Transport (`app/`)** — thin. Authenticate → validate input with Zod → call a service → map result/errors to a response. Rate limiting attaches here.
3. **Domain services (`modules/`)** — all business rules, all resource-level authorization ("may this user edit this journey?"), transactions, cross-entity orchestration. Framework-agnostic and unit-testable.
4. **Data access** — Prisma, imported only by services. Money as integer minor units + currency code. Full-text search via a generated `tsvector` column + GIN index.
5. **AI orchestrator (`ai/`)** — runs a bounded Claude tool-calling loop, streams text + tool-status events + structured UI payloads (journey cards, itinerary drafts) to the client, persists the transcript.
6. **External APIs** — every third party sits behind a `lib/` client with timeout, retry, and error mapping.

**Cross-cutting:** `env.ts` (fail-fast validated config), `logger.ts` (structured, carries request id + agent run id), `errors.ts` (typed `AppError` → HTTP status), `authz.ts` (`assertCan`), `rate-limit.ts`.

---

## 4. Database architecture

Money is stored as **integer minor units + ISO currency code**. All tables have `createdAt` / `updatedAt`. Enums are centralized. Hard delete by default; soft delete only where history matters (journeys).

### Entities

**Identity & profile**

- **User** — `id`, `email` (unique), `emailVerified`, `name`, `handle` (unique), `image`, `bio`, timestamps.
- **Session / Account / Verification** — managed by Better Auth (revocable DB sessions).
- **TravelPreference** — `userId` (1–1), `styles[]`, `pace`, `budgetTier`, `interests[]`, `homeRegion`, `dietary[]`, `updatedAt`. Its own table so the AI `getUserPreferences` tool has a clean, growable surface.
- **UserMemory** _(later)_ — `userId`, `key`, `value`, `source` (USER | AGENT_PROPOSED), `confirmedAt`. Durable facts the agent may propose and the user approves; visible/editable in settings. No vector store — small and structured.

**Journeys (published, real trips)**

- **Journey** — `id`, `authorId`, `title`, `slug` (unique), `summary`, `status` (DRAFT | PUBLISHED | ARCHIVED), `originName`, `destinationName`, `country`, `region`, `lat`, `lng`, `startDate`, `endDate`, `durationDays`, `transportModes[]`, `budgetAmount`, `budgetCurrency`, `budgetBreakdown` (jsonb, optional), `travelStyle[]`, `description` (markdown), `tips` (jsonb / text[]), `viewCount`, `publishedAt`, `deletedAt` (nullable), timestamps, `searchVector` (tsvector, generated).
- **JourneyImage** — `id`, `journeyId`, `url`, `storageKey`, `width`, `height`, `blurDataUrl`, `caption`, `position`.
- **JourneyDay** — `id`, `journeyId`, `dayNumber`, `title`, `date` (nullable), `notes`.
- **JourneyStop** — `id`, `dayId`, `position`, `time` (nullable), `type` (ACTIVITY | TRANSIT | LODGING | FOOD | NOTE), `title`, `description`, `locationName` (nullable), `lat`/`lng` (nullable), `cost` (nullable), `costCurrency`.
- **Tag** + **JourneyTag** — normalized tags (join table) so tag pages and filters are indexable. (Array column is the simpler alternative; join table chosen for queryability.)

**Discovery**

- **SavedJourney** — (`userId`, `journeyId`) composite PK, `createdAt`.
- **Follow** _(later)_ — `followerId`, `followingId`.

**Personal itineraries (user's own planning docs — distinct from a journey's built-in itinerary)**

- **Itinerary** — `id`, `ownerId`, `title`, `destinationName`, `startDate`, `endDate`, `status` (DRAFT | ACTIVE | COMPLETED), `sourceJourneyId` (nullable — "forked from"), `createdBy` (USER | AGENT), timestamps.
- **PlanDay** — `id`, `itineraryId`, `dayNumber`, `title`, `date` (nullable), `notes`.
- **PlanItem** — `id`, `planDayId`, `position`, `time` (nullable), `type`, `title`, `description`, `locationName`, `lat`/`lng`, `cost`, `costCurrency`.

> **Design note — why `PlanDay`/`PlanItem` duplicate `JourneyDay`/`JourneyStop`:** a personal itinerary and a journey's itinerary are structurally identical but belong to different lifecycles and authorization rules. The alternative is one day/item table with a polymorphic nullable FK (`journeyId` XOR `itineraryId`). That polymorphism complicates every query, index, and cascade. Accepting a little duplication keeps each query path obvious. Revisit only if the duplication causes real maintenance pain.

**Messaging (between users, about journeys)**

- **Conversation** — `id`, `journeyId` (nullable — a thread may be scoped to a journey), `lastMessageAt`.
- **ConversationParticipant** — (`conversationId`, `userId`) composite PK, `lastReadAt`. A canonical unique key on the sorted participant pair enforces one DM per pair (group threads possible later).
- **Message** — `id`, `conversationId`, `senderId`, `body`, `editedAt` (nullable), `createdAt`.

**AI (agent conversations & observability)**

- **AgentSession** — `id`, `userId`, `title` (auto-generated), `state` (jsonb: current constraints, last result ids, active draft id, pending confirmation), `summary` (rolling summary of old turns), `lastActivityAt`, `status`.
- **AgentMessage** — `id`, `sessionId`, `role` (USER | ASSISTANT | TOOL), `parts` (jsonb — text parts, tool calls, tool results as produced by the AI SDK), `createdAt`. Raw parts stored for replay and debugging.
- **AgentToolCall** — `id`, `sessionId`, `messageId`, `toolName`, `args` (jsonb), `result` (jsonb), `status` (OK | ERROR | DENIED | AWAITING_CONFIRMATION), `latencyMs`, `error` (nullable), `createdAt`. Powers observability and evals.
- **AuditLog** — `id`, `actorId`, `actorType` (USER | AGENT), `action`, `entityType`, `entityId`, `metadata` (jsonb), `createdAt`. Every sensitive or agent-initiated mutation.

### Relationship summary

- User `1─*` Journey (author); Journey `1─*` JourneyImage; Journey `1─*` JourneyDay `1─*` JourneyStop.
- User `*─*` Journey via SavedJourney.
- User `1─*` Itinerary; Itinerary `1─*` PlanDay `1─*` PlanItem; Itinerary `*─1` Journey (optional `sourceJourneyId`).
- Conversation `*─*` User via ConversationParticipant; Conversation `1─*` Message; Conversation `*─1` Journey (optional).
- User `1─*` AgentSession `1─*` AgentMessage; AgentSession `1─*` AgentToolCall.
- User / AI `1─*` AuditLog.

### Indexing highlights

`Journey(status, publishedAt)`, `Journey.slug`, GIN on `Journey.searchVector`, `Journey(destinationName)`, `Journey(budgetAmount)`, `Journey(durationDays)`, `SavedJourney(userId)`, `Message(conversationId, createdAt)`, `AgentMessage(sessionId, createdAt)`, `AgentToolCall(sessionId, createdAt)`.

---

## 5. AI architecture

### 5.1 Shape of the system

```
User message
  → /api/agent (auth, rate-limit, load AgentSession + windowed history + state)
  → Orchestrator: streamText(model=Claude, system, messages, tools, maxSteps)
      → model emits tool call
        → Tool wrapper: Zod-validate args → authz(user) → confirm gate → call domain service
        → service → Postgres → typed result → { ok: true, data } | { ok: false, error }
        → log AgentToolCall
      → model consumes result, emits more calls or final text
  → stream to client: text tokens + tool-status events + structured UI payloads
  → persist AgentMessage(s) + AgentToolCall(s); update AgentSession.state / summary
```

### 5.2 Components

**Entry point** — `app/api/agent/route.ts`: authenticate, rate-limit (requests/min + tokens/day budget), load or create the `AgentSession`, assemble context, call the orchestrator, return `toDataStreamResponse()`, then persist the transcript.

**Orchestrator** — `ai/agent/orchestrator.ts`: wraps the AI SDK `streamText` with the system prompt, the assembled `messages`, the permission-filtered tool registry, a hard `maxSteps` cap (e.g. 6), and an `onStepFinish` hook for structured logging. Breaks the loop on step cap and returns a graceful message.

**Tool factory** — `ai/tools/define-tool.ts`. Every tool is built with:

```
defineTool({
  name, description,
  input: ZodSchema,           // -> JSON Schema for the model
  kind: 'read' | 'mutate',
  confirm?: boolean,          // mutate tools that need explicit user approval
  handler: (args, ctx) => Result
})
```

On invocation the factory: validates args with Zod (rejects unknown keys, enforces bounds) → runs `authz` with the acting `ctx.userId` → if `kind === 'mutate' && confirm` and no matching confirmation token was supplied, returns `{ ok: false, status: 'needs_confirmation', preview, confirmationToken }` **without executing** → otherwise calls the domain **service** → normalizes to `{ ok: true, data } | { ok: false, error: { code, message } }` → writes an `AgentToolCall` row. **Tools import services, never Prisma.**

**Initial tool set** (design all; implement the first two in Phase 6):

| Tool                                                                                         | Kind                   | Confirm | Notes                                          |
| -------------------------------------------------------------------------------------------- | ---------------------- | ------- | ---------------------------------------------- |
| `searchJourneys(query?, destination?, maxBudget?, durationDays?, styles?, month?, limit≤20)` | read                   | –       | **Implement first.** Absorbs `filterJourneys`. |
| `getJourney(idOrSlug)`                                                                       | read                   | –       | **Implement second.**                          |
| `getUserPreferences()`                                                                       | read                   | –       | Reads `TravelPreference`.                      |
| `getSavedJourneys()`                                                                         | read                   | –       |                                                |
| `saveJourney(journeyId)`                                                                     | mutate                 | no      | Low risk, reversible.                          |
| `createItinerary(fromJourneyId?, title, destination, dates, days[])`                         | mutate                 | **yes** |                                                |
| `updateItinerary(itineraryId, patch)`                                                        | mutate                 | **yes** |                                                |
| `sendMessage(recipientId                                                                     | conversationId, body)` | mutate  | **always**                                     | Shows exact text before sending. |
| `getTravelInformation(...)`                                                                  | read                   | –       | External API, later, behind a flag.            |

**Constraint extraction** — `ai/extraction/`: a `generateObject` call with a Zod schema pulling `{ destination, durationDays, budget, styles, month }` from the user's message. Two payoffs: (1) simple queries ("Manali, 4 days, under ₹15k") skip the full agent loop and run deterministic search — faster and cheaper; (2) the extracted values render as **editable chips** so the user sees what was understood. This same path powers natural-language search on the Explore page without invoking the agent.

**State / context / memory**

- _Short-term:_ last N `AgentMessage`s, windowed. When over budget, older turns are folded into `AgentSession.summary`.
- _Working state:_ `AgentSession.state` jsonb — active constraints, last search result ids, active itinerary draft id, pending confirmation.
- _Long-term:_ `TravelPreference` (explicit) + `UserMemory` (agent-proposed, user-approved). No embeddings — the data is small and structured.
- _No cross-user memory._

**Authorization** — every tool handler receives `ctx = { userId, role }`. The agent runs **as the user, never elevated**. Read tools scope to visible data (published journeys + the user's own drafts). Mutate tools re-check ownership inside the service. Feature flags can disable tool categories per user.

**Confirmation flow** — a `confirm` tool returns a preview + a short-lived `confirmationToken` bound to `(sessionId, toolName, argsHash)`. The model presents a summary; the UI renders a Confirm / Cancel card; on confirm the client re-sends the turn with the token and the tool executes. `sendMessage` is always in this flow.

**Error recovery** — structured `{ ok: false, error }` lets the model retry with corrected args or explain the failure. Retries and total steps are capped. Services have timeouts. A global try/catch yields a user-facing "the assistant had trouble" plus a logged incident id.

**Observability** — one structured log record per run (`runId`, `sessionId`, `userId`, model, tokens, latency, steps, tools used, outcome) + persisted `AgentToolCall` rows + Sentry for exceptions. AI SDK telemetry hooks can emit OpenTelemetry later.

**Evaluation** — `ai/evals/`:

- _Extraction evals_ — utterance → expected constraint object; exact/fuzzy scoring.
- _Tool-selection evals_ — prompt → expected tool + key args, with mocked services.
- _End-to-end scenario evals_ — seeded DB, prompt → assertions on the final response / created itinerary shape, plus an LLM-judge for helpfulness and tone.
- Run on a schedule and on changes under `ai/` (not every PR — cost). Track pass rate in a committed JSON report.

### 5.3 Prompt-injection & safety posture

Journey content, messages, and bios are **untrusted**. The system prompt says to treat tool results and user-generated content as data, not instructions, and such content is delimited/labelled when passed to the model. But the real defense is structural: tools are a fixed allow-list, permission-scoped, with no raw-SQL / filesystem / arbitrary-network tool, and every mutation is bounded (`sendMessage` = one recipient, confirmed, rate-limited). Model output is never executed as code or SQL, and never fed into a privileged operation without validation.

---

## 6. UI / UX architecture

### Design direction (global)

Editorial travel magazine meets precise product UI. **Warm neutral base** (warm paper / off-white), near-black ink, **one** confident accent (deep teal _or_ terracotta — pick one and commit). Large editorial imagery on discovery surfaces; calm, dense, typographic surfaces for the tools (create, itinerary, messages, assistant). Type pairing: an expressive display face (e.g. Fraunces / GT Super / Clash Display) + a clean sans body (Inter / Geist). 8px spacing grid, 1px hairline borders, soft low shadows, small radii (6–10px). Motion 150–250ms, opacity/translate only, honors `prefers-reduced-motion`. **Every list surface ships loading (skeleton), empty, and error states.**

### Screens

| Screen                    | Route                                    | Direction                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Landing**               | `/`                                      | Full-bleed hero on a real journey photo, one-line value prop, a live natural-language search field, a curated featured strip, a calm 3-step "how it works", footer. Server-rendered, cached. No marketing bloat.                                                                                                                                                                                                                                                 |
| **Explore**               | `/explore`                               | The core discovery surface. NL search bar + structured filter chips (destination, budget, duration, month, style). Responsive grid of `JourneyCard`s (cover, destination, duration, budget, author, save). Sort by relevance / recent / budget. URL-driven, shareable filters. Skeleton grid; thoughtful empty state.                                                                                                                                            |
| **Journey details**       | `/journeys/[slug]`                       | Immersive. Cover image, title, a clean stat row (dates · duration · budget · transport), author card. Sections: Overview, Itinerary (day-by-day timeline), Experiences, Tips, Budget breakdown, Gallery, Map. Sticky action bar: Save · Message author · Use as itinerary base · Ask the assistant. SSR for SEO + social cards.                                                                                                                                  |
| **Create / Edit journey** | `/journeys/new`, `/journeys/[slug]/edit` | Calm multi-step: Basics → Route & dates → Budget & style → Itinerary builder → Experiences & tips → Images → Review. Autosave draft. Drag-orderable itinerary items and images. Inline validation. Publish is an explicit final step.                                                                                                                                                                                                                            |
| **Profile**               | `/profile/[handle]`                      | Header (avatar, name, handle, bio, preferences as tags, stats). Tabs: Published, Saved. Own profile has Edit. Account settings live at `/settings`.                                                                                                                                                                                                                                                                                                              |
| **Saved**                 | `/saved`                                 | Personal grid of saved journeys, quick unsave, filter by destination. Empty state nudges to Explore.                                                                                                                                                                                                                                                                                                                                                             |
| **Messages**              | `/messages`                              | Two-pane: conversation list (avatar, name, last message, unread dot, journey chip) + thread (bubbles, date separators, composer). Polling first; SSE/websockets later.                                                                                                                                                                                                                                                                                           |
| **AI travel workspace**   | `/assistant`                             | **Not a bare chatbot.** Two columns: left = conversation with visible tool-status chips ("Searching journeys…", "Found 6"); right = a **canvas** rendering structured output — journey result cards, a live editable itinerary draft, editable constraint chips. Canvas actions (save, open, add to itinerary) feed back into the conversation. Confirmation cards appear inline. Slim session-list sidebar. Feels like a planning tool with an assistant in it. |
| **Itinerary view**        | `/itineraries/[id]`                      | Day-by-day timeline/editor. Items with time/type/notes/cost, running budget total, map. Inline edit. "Created with assistant" badge when relevant. Export/print and share links later.                                                                                                                                                                                                                                                                           |
| **App shell**             | —                                        | Top nav: logo · Explore · Assistant · Messages · Create (primary) · avatar menu. Command palette (⌘K) for quick nav + "Ask assistant". Consistent across authed pages.                                                                                                                                                                                                                                                                                           |

### Component system

`components/ui` — shadcn primitives restyled to tokens. `components/globe` — `JourneyCard`, `StatRow`, `ItineraryTimeline`, `FilterChips`, `AuthorCard`, `AssistantMessage`, `ToolStatusChip`, `ConfirmationCard`, `EmptyState`, `ErrorState`, `Skeleton*`.

---

## 7. AI interaction UX

Principles: the assistant **augments existing surfaces**; it never replaces navigation; every AI action is **visible and reversible**; mutations are **confirmed**.

- **Natural-language search** — the Explore search bar accepts plain sentences, runs constraint extraction (not the full agent), fills the editable filter chips, and runs the normal deterministic search. Fast, cheap, transparent. A "refine with assistant" link escalates to the workspace.
- **Inline AI assistance** — small and contextual: "Ask about this trip" on a journey opens a thread pre-scoped to it; "Suggest a day" / "Balance the budget" on the itinerary editor act on the current draft **with a diff preview**; "Draft a description from my itinerary" in Create.
- **AI travel workspace** — the home for open-ended planning: the two-column conversation + canvas. Structured output renders as real UI, never as a markdown blob.
- **Visible status** — each tool call shows a chip with state (running / done / error / needs confirmation) and a one-line summary ("Searched journeys · 6 results"), expandable to args/results for trust.
- **Itinerary generation** — the assistant proposes an itinerary as an editable canvas draft; the user tweaks; "Save itinerary" is an explicit, confirmed action. Forking from a journey ("Use as base") seeds the draft in one click.
- **Contextual actions** — result cards carry inline buttons (Save · Open · Message author · Add to itinerary). The assistant may propose them, but anything mutating is user-initiated or confirmed.
- **Confirmation flows** — compact cards: what will happen, on what, Confirm / Cancel. `sendMessage` always shows the exact text. Nothing happens silently.
- **Memory transparency** — the assistant asks before remembering a preference; it is visible and editable in settings.
- **Graceful degradation** — if the AI provider is down, search and all core features still work; the assistant shows a calm error.

---

## 8. Security

**Authentication** — hashed passwords (argon2/scrypt via Better Auth), email verification required before publishing, secure `httpOnly` `SameSite` cookies, revocable DB sessions, rate-limited login / signup / password-reset, OAuth PKCE + state handled by the library, optional 2FA later.

**Authorization** — two layers: an auth gate in the route/action, and a **resource-level check in the service** (`assertCan(user, action, resource)`) that never trusts the client or the model. Draft journeys are invisible to others; messages are visible only to participants.

**Secrets / API keys** — server-side only, via `env.ts`; never `NEXT_PUBLIC_*` for secrets. The Anthropic key is server-only with a spend cap and usage alert. Separate keys per environment. `.env` gitignored; `.env.example` committed.

**AI tools** — strict Zod validation on every argument (reject unknown keys, bound every number and string, enum-only fields, id-format checks). Tools are a fixed allow-list — no dynamic/eval tool, no raw-SQL tool, no filesystem or arbitrary-network tool. Explicit `kind` (read/mutate); mutations only via services with the user's identity; per-tool and per-session call caps; `maxSteps` cap; service timeouts.

**User data** — least-exposure mappers (never emit password hashes, other users' emails, or internal ids where a slug suffices). Image uploads validated (mime, size, dimensions), stored under random keys, signed URLs if private. Account-deletion path with cascade (later).

**Prompt injection** — user-generated content and tool results are treated as untrusted data and labelled as such to the model; the real containment is permission-scoped tools + confirmation for mutations. Model output is never executed or reflected into a privileged call without validation. User markdown is sanitized to a strict allowlist before render; no `dangerouslySetInnerHTML` on user content.

**Malicious tool arguments** — Zod bounds (`limit ≤ 20`, string max lengths, enums, id patterns, no negative/huge numbers); services still enforce business rules; Prisma parametrizes all queries; pagination is capped.

**Rate limiting** — per-IP on auth endpoints; per-user on writes (create journey, send message) and on `/api/agent` (requests/min + tokens/day); Upstash Redis in prod, in-memory in dev; `429` with `Retry-After`.

**General** — CSRF (SameSite + origin checks on actions), security headers (CSP, HSTS, X-Frame-Options) in `next.config`, input length limits, Dependabot, `AuditLog` for sensitive and agent-initiated mutations.

---

## 9. Deployment architecture

| Piece              | Choice                                                                                                                           | Notes                                                                                                                                                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App + API          | **Vercel** (Hobby, free)                                                                                                         | Next.js-native; `/api/agent` as a streaming Node function; watch the ~60s stream ceiling — fine now, move to a worker if agent runs lengthen                                                                                                                     |
| Database           | **Neon** (free)                                                                                                                  | Serverless Postgres, PgBouncer pooling, **branch per PR/preview**; Prisma pooled `url` + `directUrl` for migrations                                                                                                                                              |
| Migrations         | `prisma migrate deploy` in CI on merge to `main`; PR previews migrate their own Neon branch                                      |
| Object storage     | **Cloudflare R2** (zero egress) or UploadThing free tier                                                                         | `next/image` remote patterns + CDN                                                                                                                                                                                                                               |
| AI provider        | **Anthropic API**                                                                                                                | Server-side only, spend cap + alert, per-env keys                                                                                                                                                                                                                |
| Email              | **Resend** free tier                                                                                                             | Verification, password reset, later notifications                                                                                                                                                                                                                |
| Cache / rate-limit | **Upstash Redis** free tier                                                                                                      | Serverless HTTP                                                                                                                                                                                                                                                  |
| Domain             | Cloudflare Registrar (~$10/yr)                                                                                                   | DNS on Cloudflare, bound to Vercel                                                                                                                                                                                                                               |
| Env config         | `.env.local` (dev); Vercel env vars with **preview and prod separated**; validated at boot by `env.ts`; `.env.example` committed |
| CI/CD              | **GitHub Actions**                                                                                                               | PR: install → typecheck (`tsc --noEmit`) → lint → `prisma validate` → Vitest (ephemeral Postgres or Neon branch) → build → Playwright subset; Vercel auto preview. Merge to `main`: `prisma migrate deploy` → Vercel prod. Scheduled: AI evals → report artifact |
| Observability      | **Sentry** free (errors) + Vercel Analytics or PostHog free (product) + `/api/health` with UptimeRobot                           |
| Backups            | Scheduled `pg_dump` GitHub Action → R2 (Neon PITR is paid-tier)                                                                  |

**Monthly cost target:** ~$0–5 infrastructure + domain (amortized) + Anthropic usage (cap at, say, $20/mo).

---

## 10. Development roadmap

Each phase names **what to build** and **what to understand before moving on**. Phases 0–3 already constitute a genuinely useful platform; ship those before over-investing in AI.

### Phase 0 — Foundations

**Build:** Next.js + TS + Tailwind v4 + shadcn init; `lib/env.ts`, `lib/db.ts`, `lib/logger.ts`, `lib/errors.ts`; Prisma connected to Neon with a minimal `User` model and one migration; `app/api/health`; base layout + design tokens + a placeholder landing page; `.github/workflows/ci.yml` (typecheck / lint / `prisma validate` / test); Vercel deploy.
**Understand:** the App Router model (server vs client components); server actions vs route handlers; the `app/` → `modules/` → Prisma boundary; fail-fast env validation; how migrations flow through CI.

### Phase 1 — Authentication & profile

**Build:** Better Auth (email/password + Google), DB sessions, protected-route middleware, `modules/users`, profile + `/settings` pages, `TravelPreference`.
**Understand:** session vs JWT tradeoffs; where authorization lives (service layer); cookie/CSRF settings; how the auth adapter maps to Prisma models.

### Phase 2 — Journey system (CRUD)

**Build:** `modules/journeys` (service + Zod schemas + actions + mappers); multi-step create/edit form with autosave; journey details page; image upload to R2; DRAFT/PUBLISHED states; `JourneyImage`, `JourneyDay`, `JourneyStop`.
**Understand:** service boundary and transactions; end-to-end input validation; authorization on edit/delete; the image-upload + storage-key flow; ISR/caching for detail pages.

### Phase 3 — Discovery & search

**Build:** Explore page; `modules/search` with Postgres FTS (`tsvector` + GIN + ranking); filter chips with URL-driven state; keyset pagination / infinite scroll; `SavedJourney` + save/unsave; Saved page; skeleton/empty/error states.
**Understand:** how `tsvector` ranking works; keyset vs offset pagination; keeping filter state in the URL; cache invalidation on save.

### Phase 4 — Messaging

**Build:** `modules/messaging`; `Conversation` / `ConversationParticipant` / `Message`; two-pane UI; "Message author" entry from a journey; unread state; polling for updates.
**Understand:** participant-scoped authorization; avoiding N+1 on conversation lists; why polling first and the trigger for SSE/websockets.

### Phase 5 — Personal itineraries (no AI)

**Build:** `modules/itineraries`; `Itinerary` / `PlanDay` / `PlanItem`; itinerary editor with drag-order; "Use journey as base" fork; running budget totals.
**Understand:** why the plan tables are separate from journey-itinerary tables; optimistic UI for editing; derived vs stored values.

### Phase 6 — AI foundation: tools + extraction (no agent loop yet)

**Build:** `ai/` scaffold; `defineTool` factory (Zod → schema, authz, logging, result contract); implement `searchJourneys` + `getJourney` against services; `AgentToolCall` logging; constraint extraction with `generateObject`; wire NL search on Explore to extraction.
**Understand:** tool schema design; why tools call services not Prisma; the structured result contract; how Zod becomes a model-facing JSON schema; the cost of each model call.

### Phase 7 — Agent orchestrator + workspace UI

**Build:** `/api/agent` streaming route; orchestrator via `streamText` + `maxSteps` + tool registry; `AgentSession` / `AgentMessage` persistence with windowed history + rolling summary; the two-column workspace (`useChat` + canvas); tool-status chips.
**Understand:** the bounded tool-calling loop; the streaming data protocol (text + custom events); session/state management; context-window budgeting; failure/timeout handling.

### Phase 8 — Mutating tools + confirmation

**Build:** `saveJourney`, `createItinerary`, `updateItinerary`, `sendMessage` (always confirm); the confirmation-token flow end to end; confirmation cards; `AuditLog`; per-session/per-tool rate caps.
**Understand:** the confirmation-token design (scope, TTL, args hash); agent-as-user authorization; audit logging; mutation idempotency.

### Phase 9 — AI evaluation & observability

**Build:** `ai/evals` (extraction dataset, tool-selection, seeded e2e scenarios, LLM-judge); CI eval workflow + committed JSON report; structured agent-run logging; Sentry; basic SQL/admin views.
**Understand:** how to measure agent quality; regression tracking; cost/latency monitoring; reading traces.

### Phase 10 — UI polish & production hardening

**Build:** full skeleton/empty/error pass; motion polish; accessibility audit (keyboard, focus, contrast, reduced-motion); command palette; CSP + security headers; prod rate limiting (Upstash); `pg_dump` backup job; uptime checks; performance pass (images, bundle, indexes); SEO + social cards.
**Understand:** Core Web Vitals levers in Next.js; CSP tradeoffs; a11y tooling; remaining scaling limits.

**Later / only on a concrete trigger:** pgvector semantic search (if FTS recall proves weak); follows / social graph; notifications; real-time messaging (Pusher/Ably/Supabase Realtime); itinerary sharing/export; place & weather API tool; mobile app (→ then reconsider a monorepo + separate API).

---

## 11. Major risks & tradeoffs

| Risk / tradeoff                                     | Detail                                                           | Mitigation                                                                                                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Serverless vs. long AI runs                         | Streaming agent loops can exceed serverless limits as tools grow | Cap `maxSteps`, keep tools fast, extraction path for simple queries; move to Inngest/Trigger.dev worker when runs lengthen                        |
| Next.js coupling                                    | UI + API deploy together, no independent scaling                 | Acceptable at this scale; `modules/` service layer makes extraction cheap                                                                         |
| Prisma serverless connections                       | Cold starts, connection limits                                   | Neon pooler + `directUrl`; Drizzle is the documented escape hatch                                                                                 |
| AI cost creep                                       | Every agent turn = several model calls                           | Extraction path avoids the loop for simple queries; per-user token/day budget; cheaper model for extraction; spend cap; evals gate prompt changes |
| Prompt injection via user content                   | Journeys/messages are untrusted                                  | Permission-scoped tools + confirmation for mutations; prompt hardening is secondary, not the defense                                              |
| Better Auth maturity                                | Young library                                                    | `modules/auth` boundary localizes a swap to Auth.js v5 / Clerk                                                                                    |
| Schema duplication (journey vs. personal itinerary) | Two near-identical day/item table pairs                          | Deliberate — avoids a polymorphic FK; revisit only on real pain                                                                                   |
| FTS vs. semantic search                             | Won't match "chill mountain trip" to "relaxed Himalayan trek"    | Accept for v1; pgvector is an additive upgrade behind the same `modules/search` interface                                                         |
| Realtime messaging deferred                         | Polling only at first                                            | Fine at low traffic; design the messaging interface so a realtime provider swaps in                                                               |
| Solo scope                                          | 10 phases is a lot                                               | Phases 0–3 are a shippable product on their own; treat 6–8 as the differentiator, 9–10 as polish                                                  |

---

## 12. The exact next implementation task

**Phase 0, step 1 — scaffold the project and prove the pipeline end to end.** Nothing else.

1. `npx create-next-app@latest globelink` — TypeScript, App Router, Tailwind, `src/` directory.
2. Add core deps: `prisma`, `@prisma/client`, `zod`, `@t3-oss/env-nextjs`, `pino`; dev: `vitest`, `@vitejs/plugin-react`, `prettier`, `eslint-config-next`.
3. Create `src/lib/env.ts` (Zod-validated env), `src/lib/db.ts` (Prisma singleton), `src/lib/logger.ts`, `src/lib/errors.ts` (typed `AppError`).
4. `prisma/schema.prisma` — datasource + generator + a minimal `User` model, pointed at a free Neon project (`DATABASE_URL`, `DIRECT_URL`).
5. `prisma migrate dev --name init` — confirm it applies to Neon.
6. `src/app/api/health/route.ts` — returns `{ status: 'ok', db: <SELECT 1 result> }`.
7. Base `layout.tsx` + `globals.css` with design tokens (color, spacing, radius, font vars) and a placeholder landing page that uses them.
8. `.github/workflows/ci.yml` — install → `tsc --noEmit` → lint → `prisma validate` → `vitest run`.
9. Push to GitHub, connect Vercel, set env vars for preview + prod, confirm both deploy and that `/api/health` returns `ok` in production.

**Then stop and review.** Deliverable: a deployed skeleton with validated env, a working migration, a health check, the design-token foundation, and green CI — and nothing more. Phase 1 (auth) begins only after that review.
