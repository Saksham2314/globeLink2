# ADR 0001 — Phase 0 foundations

- **Status:** accepted
- **Date:** 2026-09-01
- **Context:** first implementation phase of the GlobeLink rebuild. See
  `docs/ARCHITECTURE.md` for the full proposal this refines.

## Decisions

### 1. Single Next.js application repository

One deployable, one language, no shared packages consumed by multiple apps.
A monorepo (Turborepo / workspaces) is deferred until a second consumer exists
(mobile app, standalone worker). Feature code lives under `src/modules/*` so a
future extraction is mechanical.

### 2. Manual scaffold instead of `create-next-app`

`create-next-app` refuses to run in a non-empty directory (`docs/` already
existed) and emits starter cruft that would be deleted anyway. Every file is
written deliberately, matching the "understand every layer" philosophy.

### 3. Authentication: Auth.js (NextAuth), added in Phase 1

Chosen over Better Auth per the project owner's direction. No auth code ships in
Phase 0. The `User` model is deliberately minimal; Phase 1 adds `emailVerified`
plus the Auth.js adapter tables (`Account`, `Session`, `VerificationToken`).

### 4. Accent colour: terracotta

Single confident accent (`#b8552f` light / `#d1704f` dark) over a warm-paper
neutral base. Defined once in `src/styles/tokens.css` and bridged into Tailwind
v4 via `@theme inline` so light/dark `prefers-color-scheme` overrides keep
working through the utility classes.

### 5. Zod v3 (not v4)

v3 is the lowest-risk choice across the tools that arrive in later phases
(Auth.js, form resolvers, AI tool schemas). Upgrading to v4 can be its own ADR.

### 6. Offline-reproducible migration

`prisma/migrations/20260901120000_init/migration.sql` is hand-written and
committed so the schema is reproducible without a live database. It is the exact
SQL Prisma generates for the current `schema.prisma`.

### 7. Logging: pino, structured JSON only

No `pino-pretty` transport wired into the runtime (avoids Next.js
worker-thread bundling issues). Pretty output is opt-in by piping the dev
server. `pino` is listed in `serverExternalPackages`.

## Consequences

- `src/app/` is transport/composition only; `src/lib` holds cross-cutting
  primitives; `src/modules` (empty until Phase 2) will hold domain logic and is
  the only place Prisma may be imported.
- CI enforces lint + typecheck + prisma validate + format + test + build on
  every PR. It runs static checks only — no live database.
