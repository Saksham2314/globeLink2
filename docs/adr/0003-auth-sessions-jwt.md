# ADR 0003 — JWT sessions (not database sessions)

- **Status:** accepted
- **Date:** 2026-09-01
- **Revises:** the "database sessions (revocable)" line in `docs/ARCHITECTURE.md`
  §2 and §8, which was written assuming Better Auth.

## Context

Phase 1 uses Auth.js (NextAuth v5) with email/password via the **Credentials
provider**. Auth.js's Credentials provider is, by design, incompatible with the
`database` session strategy: it never calls the adapter's `createSession`, so
`strategy: "database"` yields no working session for credentials sign-ins. This
is a documented Auth.js constraint, not a bug we can configure around. OAuth
(Google) would work with database sessions, but the strategy is global — it
cannot be per-provider.

## Decision

Use `session: { strategy: "jwt" }` with a 30-day `maxAge`.

- The session is a signed (and encrypted) cookie; `AUTH_SECRET` signs it.
- The `session` callback copies `token.sub` (the user id) onto
  `session.user.id` so `auth()` returns a stable id everywhere.
- The Prisma adapter is still configured. It persists `User` and `Account`
  rows (so OAuth identities and the user record live in our database), and the
  `Session` / `VerificationToken` tables exist for the adapter contract even
  though `Session` stays empty under this strategy.
- OAuth-created users are backfilled with a handle and an empty
  `TravelPreference` row in the `events.createUser` hook (the credentials path
  does this itself in `registerUser`).

## Consequences / tradeoffs

- **No server-side per-session revocation.** We cannot invalidate one device's
  session on demand. A password change does not currently invalidate existing
  JWTs either.
- Mitigations available when needed, in rough order of effort: shorten
  `maxAge`; add a `sessionsValidAfter` timestamp on `User`, set it on
  password-change / "log out everywhere", and reject older tokens in the
  `session` callback (one extra DB read per request); or move password auth off
  the Credentials provider entirely (e.g. email magic-link) to regain database
  sessions.
- For a portfolio-stage product with nothing sensitive stored yet, the
  stateless model is an acceptable starting point. Revisit in the security
  hardening phase.

## Also decided here

- **Password hashing:** bcrypt (`bcryptjs`, pure JS — no native build step on
  Vercel), work factor 12. Auth.js ships no password handling; this lives in
  `src/modules/auth/password.ts`.
- **Google account linking:** `allowDangerousEmailAccountLinking: true`. A
  Google sign-in merges into an existing account with the same email. Safe
  here because Google verifies emails and our credentials sign-up also requires
  verification.
- **Edge/Node split:** `middleware.ts` runs on the Edge runtime, which cannot
  load Prisma or bcrypt. `src/lib/auth.config.ts` holds the Edge-safe config
  (sign-in page + `authorized` route rule); `src/lib/auth.ts` spreads it and
  adds the adapter and providers for the Node runtime.
- **Email verification is enforced softly:** unverified users can sign in and
  use the app; a banner prompts them to verify. Gating specific actions (e.g.
  publishing a journey) on verification comes with those features.
