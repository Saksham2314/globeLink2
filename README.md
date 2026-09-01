# GlobeLink

A modern travel-experience and journey-planning platform. Travellers publish
journeys they have completed; others discover, save, and plan from the real
thing. An AI assistant sits on top, acting only through validated tools.

Full technical proposal: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
Decisions log: [`docs/adr/`](docs/adr).

## Status — Phase 0 (foundations)

Implemented: project scaffold, design system, Prisma + Postgres wiring, env
validation, logging, error utilities, minimal `User` schema + migration,
`/api/health`, landing page, CI.

**Not yet implemented:** authentication, journeys, search, messaging, itineraries,
the AI assistant. See the roadmap in `docs/ARCHITECTURE.md`.

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Prisma + PostgreSQL (Neon) · Zod · pino · Vitest.

## Getting started

```bash
# 1. Install dependencies (also generates the Prisma client)
npm install

# 2. Configure environment
cp .env.example .env
#    then edit .env — set DATABASE_URL / DIRECT_URL to a Postgres or Neon instance

# 3. Apply the database migration
npm run db:migrate:deploy      # or: npm run db:migrate  (dev)

# 4. Run the app
npm run dev                    # http://localhost:3000
```

Verify the database wiring: open <http://localhost:3000/api/health> — it should
report `{ "status": "ok", "db": "up" }`. Until `DATABASE_URL` points at a real
database it returns `503` with `"db": "down"`; the rest of the app still runs.

## Scripts

| Command                           | Purpose                                             |
| --------------------------------- | --------------------------------------------------- |
| `npm run dev`                     | Start the dev server                                |
| `npm run build`                   | Generate the Prisma client and build for production |
| `npm run start`                   | Serve the production build                          |
| `npm run lint`                    | ESLint (flat config, `next/core-web-vitals`)        |
| `npm run typecheck`               | `tsc --noEmit`                                      |
| `npm run test`                    | Vitest (unit)                                       |
| `npm run format` / `format:check` | Prettier                                            |
| `npm run db:migrate`              | Create/apply a dev migration                        |
| `npm run db:migrate:deploy`       | Apply committed migrations (CI / prod)              |
| `npm run db:studio`               | Prisma Studio                                       |

## Project layout

```
src/
  app/            Routes + composition only (no business logic)
    api/health/   Liveness + DB readiness probe
  components/
    ui/           Design-system primitives (Button, Container)
    globe/        Composed app components (SiteHeader, SiteFooter)
  lib/            Cross-cutting: env, db, logger, errors, utils
  styles/         Design tokens
  test/           Test setup
prisma/           schema.prisma + migrations + seed
docs/             Architecture proposal + ADRs
```

## Deployment

Target: Vercel (app) + Neon (Postgres). On Vercel set `DATABASE_URL`,
`DIRECT_URL`, and `NEXT_PUBLIC_APP_URL` for both Preview and Production. The
build command (`npm run build`) runs `prisma generate`; run
`npm run db:migrate:deploy` against the production database as a release step.
