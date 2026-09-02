# ADR 0013 — UI polish & production hardening (Phase 10)

- **Status:** accepted
- **Date:** 2026-09-02

## Context

The last phase in `docs/ARCHITECTURE.md`. Feature work is done; this phase is
loading/empty/error states, an accessibility pass, a Content-Security-Policy, a
⌘K command palette, SEO surfaces, and production-operations documentation.
Locked decisions from planning: **include** the command palette; ship CSP
**Report-Only** first; keep production infrastructure **lean and documented**
(no Upstash, no custom `pg_dump` job).

## Decisions

### 1. Loading / empty / error states

A `Skeleton` primitive (`src/components/ui/skeleton.tsx`) with `CardSkeleton` /
`CardGridSkeleton` / `ListSkeleton` compositions; the pulse is behind
`motion-safe:` so reduced-motion users get a static tint. `loading.tsx` added
for `/explore`, `/saved`, `/itineraries`, `/messages`, `/profile/[handle]`. A
segment `error.tsx` for the `(app)` group keeps the header/footer shell and
shows the `digest` as a reference id. Empty states already existed on the list
surfaces and were left as-is.

### 2. Accessibility

- `<SkipLink>` in the root layout targets `#main-content`, which every `<main>`
  now carries.
- `useFocusTrap(ref, active, onClose)` (`src/hooks/`) — first-focus, Tab cycle,
  Escape, focus-restore. Used by modal-like surfaces (the command palette);
  **not** by dropdown menus, where a trap is more annoying than helpful.
- `UserMenu` / `MobileNav` now return focus to their trigger on Escape and carry
  `aria-haspopup` / `aria-label`.

### 3. Content-Security-Policy — Report-Only

`middleware.ts` generates a per-request nonce, sets `x-nonce` on the forwarded
request headers, and attaches a **`Content-Security-Policy-Report-Only`** header
built by `src/lib/csp.ts`. Report-Only means the browser blocks nothing and
POSTs every would-be violation to `/api/csp-report` (which just logs). The one
inline script we own — the no-flash theme script — reads the nonce via
`headers()` in the now-`async` root layout; the journey-page JSON-LD block does
the same.

Policy highlights: `script-src 'self' 'nonce-…' 'strict-dynamic'` (+
`'unsafe-eval'` in dev), `style-src 'self' 'unsafe-inline'` (React sets inline
style props; nonced styles would break them), `img-src` allowlists the Vercel
Blob host and Google's avatar host, `frame-ancestors 'none'`, `object-src
'none'`. **Flipping to enforcing** is a one-line change (`Content-Security-Policy`
instead of `-Report-Only`) once the reports are clean — deliberately left for a
follow-up.

### 4. Command palette (⌘K)

`src/components/globe/command-palette.tsx`, mounted in the `(app)` layout for
signed-in users. Opens on ⌘K / Ctrl+K or via the header `CommandPaletteTrigger`
(which dispatches a window event, so the server-rendered header needs no state).
No new dependency — it is a filtered list with arrow/Enter/Escape handling and
`useFocusTrap`. Commands: navigate (Explore, Saved, Itineraries, Messages,
Assistant, Settings), create (journey, itinerary), switch theme, jump to a
recent journey/itinerary (`quickNavTargetsAction`, lazy-loaded on first open),
and "search journeys for …" → `/explore?q=`.

### 5. SEO

`app/sitemap.ts` (ISR, hourly) lists static routes + every published journey +
every public profile. `app/robots.ts` allows `/` and disallows the signed-in
surfaces and `/api/`. Journey pages emit `TouristTrip` JSON-LD (published only).
`generateMetadata` with OpenGraph already existed on the dynamic pages.
**Not done:** dynamic `next/og` OpenGraph images — `ImageResponse` on the edge
with font loading is a build-fragility risk that outweighs its value here;
deferred.

### 6. Production infrastructure — lean + documented

- **Rate limiting stays in-memory.** `/api/agent` resets its per-user
  requests/minute window on cold start; the `AgentRun` tokens/day budget (Phase 9) is DB-backed and survives. `docs/operations.md` records the tradeoff and
  where Upstash would slot in if abuse becomes real.
- **Backups: rely on Neon.** No custom `pg_dump` job. `docs/operations.md`
  documents Neon's history/branching restore and how to take a manual dump.
- **Uptime:** `docs/operations.md` describes pointing UptimeRobot at
  `/api/health` (alert on non-200 or `db != "up"`).

## Consequences

- New: `Skeleton` + 5 `loading.tsx` + `(app)/error.tsx`; `useFocusTrap`,
  `<SkipLink>`; `command-palette*.tsx` + `quickNavTargetsAction` /
  `getQuickNavTargets`; `lib/csp.ts` + `/api/csp-report`; `app/sitemap.ts` +
  `app/robots.ts` + journey JSON-LD; `docs/operations.md`.
- Changed: `middleware.ts` wraps the auth middleware to add the nonce + CSP
  header; the root layout is `async` to read the nonce; `UserMenu` / `MobileNav`
  focus handling; the header gains the palette trigger.
- The root layout reading `headers()` does not add a rendering cost — every
  route was already dynamic (the header calls `auth()`).
- Follow-up (not this phase): flip CSP to enforcing once reports are clean;
  dynamic OG images; move rate limiting to a shared store if needed.
