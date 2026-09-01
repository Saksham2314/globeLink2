# ADR 0004 — Journey system (Phase 2)

- **Status:** accepted
- **Date:** 2026-09-01

## Context

Phase 2 adds authoring and viewing of journeys: a published trip with a
day-by-day itinerary, photos and tags. Three options were put to the project
owner, who chose the lean path for each.

## Decisions

### 1. Schema — enums where the set is fixed

`JourneyStatus` (DRAFT/PUBLISHED/ARCHIVED) and `StopType` are **Postgres
enums** — the sets are fixed and integrity matters, especially for the AI that
will read this data later. `transportModes` and `travelStyle` stay `String[]`
validated by Zod (`src/lib/travel-vocab.ts`), so the vocab can grow without a
migration. Money is integer minor units + ISO code throughout. `Journey` is
**soft-deleted** (`deletedAt`) so future `SavedJourney` rows won't dangle.
Cover image is an `isCover` flag on `JourneyImage` (service keeps exactly one),
avoiding a circular FK between `Journey` and `JourneyImage`.

### 2. Editing UX — create draft, then one sectioned page

`/journeys/new` takes only a title, creates a DRAFT, and redirects to
`/journeys/<slug>/edit`, where each section (Basics, Dates, Budget & style,
Itinerary, Story & tips, Photos) is an independent form that saves on its own.
No multi-step wizard, no cross-step state. The itinerary is the one interactive
piece — client-managed day/stop list, reordered with up/down buttons, saved as
one JSON payload that **replaces the whole itinerary in a transaction** (delete

- recreate; simpler and always consistent versus diffing, and an itinerary is
  small).

### 3. Images — Vercel Blob, server-side upload

`vercel blob create-store` provisioned `globelink-media` (public) and linked
`BLOB_READ_WRITE_TOKEN` to the project. Upload goes through
`POST /api/journeys/<id>/images` (multipart) → validate type + 4 MB limit →
`put()` → `JourneyImage` row. The 4 MB cap keeps the file within the serverless
body limit; the `@vercel/blob` client-upload flow (which bypasses that limit)
is the upgrade path if larger files are needed. Deleting an image also deletes
the blob (best-effort). Dimensions/blur placeholders are deferred to polish.

### 4. Markdown

`description` and long text are markdown, rendered with `react-markdown` +
`remark-gfm` + **`rehype-sanitize`**. Sanitize strips scripts, event handlers
and raw HTML, so arbitrary user input is safe to render. No WYSIWYG editor —
a plain textarea with a hint.

### 5. Public detail page is dynamic, not ISR — for now

`/journeys/<slug>` calls `auth()` (to let an author preview their own draft and
to skip the view counter for the author), which makes the route dynamic, so
`export const revalidate` has no effect yet. The `revalidatePath` calls in the
actions are already wired for when this is revisited. Turning the page into
true ISR (splitting the auth-dependent bits into a `<Suspense>` island so the
shell can be static) is a Phase-10 optimization. Each render is a single
indexed query with includes — fast enough for now.

## Consequences

- `src/modules/journeys/` mirrors the Phase 1 module shape: `journey.schema`,
  `journey.service` (the only place Prisma is touched, every mutation
  `assertOwnership`), `journey.mappers`, `journey.actions`, plus `journey.slug`
  (pure) / `journey.slug.server` (DB) and `journey.storage` (Blob).
- `TRAVEL_STYLES` moved from `user.schema` to `lib/travel-vocab` (shared by
  users and journeys) and is re-exported from `user.schema` for compatibility.
- New route protection: `/journeys/new` and `/journeys/*/edit` require sign-in
  (in `auth.config.ts`); `/journeys/<slug>` stays public.
