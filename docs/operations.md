# Operations

Running GlobeLink in production. Companion to `docs/ARCHITECTURE.md` (design)
and `docs/adr/` (decisions).

## Hosting

| Piece      | Where                               | Notes                                                                   |
| ---------- | ----------------------------------- | ----------------------------------------------------------------------- |
| App        | Vercel                              | Auto-deploys on push to `main`; PRs get preview URLs                    |
| Database   | Neon (PostgreSQL, `ap-southeast-1`) | Pooled `DATABASE_URL` for the app, unpooled `DIRECT_URL` for migrations |
| Blob store | Vercel Blob                         | Journey photos + avatars                                                |
| Functions  | `sin1` region (`vercel.json`)       | Co-located with Neon — DB round-trip ~2–3 ms                            |

## Environment variables

Set for **Production** (and Preview where it makes sense) in the Vercel project.
See `.env.example` for the full annotated list. Required: `DATABASE_URL`,
`DIRECT_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`. Optional but expected:
`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, `BLOB_READ_WRITE_TOKEN`,
`ANTHROPIC_API_KEY`, the `SMTP_*` group + `EMAIL_FROM`, `NEXT_PUBLIC_SENTRY_DSN`.

## Deploys & migrations

- Code: `git push` to `main` → Vercel builds (`npm run build`, which runs
  `prisma generate`) and deploys. Manual: `npx vercel deploy --prod`.
- Migrations are **hand-written** and applied as a release step:
  `npm run db:migrate:deploy` (`prisma migrate deploy`) against the production
  database. **Never** run `prisma migrate diff --shadow-database-url` against
  production, `prisma db push`, `migrate reset`, or any `DROP` / `TRUNCATE`.
  See `docs/adr/` and the migration notes in the README.

## Backups & restore

We rely on **Neon's built-in history** rather than a custom dump job (Phase 10
decision — keep infra lean).

- **Point-in-time restore / branching:** in the Neon console, create a branch
  from a past timestamp, verify it, then repoint `DATABASE_URL` / `DIRECT_URL`
  or promote the branch. Retention depends on the Neon plan.
- **Manual snapshot** (before a risky migration, or for an off-site copy):
  ```bash
  pg_dump "$DIRECT_URL" --no-owner --format=custom --file=globelink-$(date +%F).dump
  # restore:  pg_restore --clean --no-owner --dbname="$TARGET_URL" globelink-*.dump
  ```
  Store the dump somewhere off Vercel/Neon (it contains user data — treat as
  sensitive).

## Uptime monitoring

`GET /api/health` returns `{ status, db, latencyMs }` — `200` with `"db":"up"`
when healthy, `503` when the database is unreachable.

Point **UptimeRobot** (or any checker) at
`https://<app>/api/health`, 5-minute interval, alert when the response is not
`200` **or** the body does not contain `"db":"up"`.

## Rate limiting

`/api/agent` has two limits:

- **Requests/minute per user** — in-memory (`Map` in the route module). It
  **resets on a cold start**, so the effective ceiling is softer than the
  configured 12/min. Acceptable for current scale. If abuse becomes real, move
  this counter to a shared store (Upstash Redis / Vercel KV) — the logic is
  isolated in `src/app/api/agent/route.ts`.
- **Tokens/day per user** — DB-backed (`AgentRun.totalTokens` summed over 24 h),
  so it survives cold starts. Budget: `DAILY_TOKEN_BUDGET` in the same file.

## Error tracking

Sentry (`@sentry/nextjs`) is wired but **inert** until `NEXT_PUBLIC_SENTRY_DSN`
is set — with no DSN the SDK and its build plugin are dropped from the bundle.
To enable: create a Sentry project, set `NEXT_PUBLIC_SENTRY_DSN` (and optionally
`SENTRY_AUTH_TOKEN` for readable stack traces) in Vercel, redeploy.

## Content-Security-Policy

Shipped **Report-Only** (`src/lib/csp.ts`, applied in `middleware.ts`).
Violation reports POST to `/api/csp-report` and are logged. To move to
enforcing once the reports are clean: change the header name in `middleware.ts`
from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.

## AI evals

`npm run eval` runs the model-backed suites (needs `ANTHROPIC_API_KEY`). CI runs
them weekly and on `src/ai/**` PRs via `.github/workflows/ai-evals.yml`
(informational, never blocks a merge) — needs an `ANTHROPIC_API_KEY` repo
secret. Latest results: `src/ai/evals/report.json`.

## Transactional email

Sent over **SMTP** via `nodemailer` (`src/lib/email.ts`) — no verified domain
required. For Gmail: set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`,
`SMTP_USER=<your-gmail>`, `SMTP_PASS=<Google App Password>` (needs 2-Step
Verification on the account), and `EMAIL_FROM` (typically the same address).
With no `SMTP_*` config the message — verification link included — is logged to
the server console, so local dev still works.
