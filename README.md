# GlobeLink

A modern travel-experience and journey-planning platform. Travellers publish
journeys they have completed; others discover, save, and plan from the real
thing. An AI assistant sits on top, acting only through validated tools.

Full technical proposal: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
Decisions log: [`docs/adr/`](docs/adr).

## Status — Phase 5 (personal itineraries)

Implemented: Phase 0–4, plus private trip planning — an `/itineraries` list, a
create screen, and a single always-editable page per plan with a day-by-day
builder, a live cost estimate, and a "Plan my own" button on journey pages that
forks a published journey into an editable plan.

**Not yet implemented:** the AI assistant. See `docs/ARCHITECTURE.md`; phase
decisions are in `docs/adr/`.

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Prisma + PostgreSQL (Neon) · Auth.js v5 · Vercel Blob · Zod · pino · Resend ·
react-markdown · Vitest.

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
  app/
    (auth)/       login, signup (minimal centred layout)
    (app)/        settings, profile/[handle] (header + footer shell)
    api/          auth/[...nextauth], auth/verify-email, health
  components/
    ui/           Design-system primitives (Button, Input, Field, …)
    globe/        Composed app components (SiteHeader, forms, UserMenu, …)
    motion/       Scroll-reveal primitives
  modules/        Domain logic — the only place Prisma is imported
    auth/         password, schema, verification, service, actions
    users/        handle, schema, mappers, service, actions
  lib/            Cross-cutting: env, db, auth, authz, logger, errors, email, forms
  styles/         Design tokens
  middleware.ts   Route protection (Edge, via lib/auth.config.ts)
prisma/           schema.prisma + migrations + seed
docs/             Architecture proposal + ADRs
```

## Deployment

Target: Vercel (app) + Neon (Postgres). On Vercel set `DATABASE_URL`,
`DIRECT_URL`, `NEXT_PUBLIC_APP_URL` and `AUTH_SECRET` for both Preview and
Production; add `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` and `RESEND_API_KEY` to
enable Google sign-in and real verification emails. The build command
(`npm run build`) runs `prisma generate`; run `npm run db:migrate:deploy`
against the production database as a release step.
