# ADR 0005 — Discovery & search (Phase 3)

- **Status:** accepted
- **Date:** 2026-09-02

## Context

Phase 3 makes published journeys findable: an `/explore` page with full-text
search + filters, and the ability to save journeys (`/saved`). Two options were
put to the project owner, who chose the fuller/correct one for each.

## Decisions

### 1. Full-text search — hand-written SQL with `ts_rank`

A Postgres **generated `tsvector` column** (`Journey.searchVector`), maintained
by the database, with a **GIN index**. `search.service.searchJourneys` runs a
raw `$queryRaw` (composed with `Prisma.sql`) that filters + ranks with
`websearch_to_tsquery` / `ts_rank`, returning only ids + a keyset value; the
full rows are then loaded via Prisma so the existing `toCardDto` mapping (cover
image, author, `isSaved`) still applies, in the exact ranked order.

Immutability constraints on a generated column forced two choices:

- `to_tsvector('english'::regconfig, …)` — the bare-string 2-arg form is not
  IMMUTABLE.
- **Only scalar text columns** feed the vector (title A, destination/country/
  region B, summary C, origin/description D). Casting a `text[]` to text — via
  `::text` or `array_to_string` — is only STABLE, which a generated column
  rejects. `travelStyle` / `transportModes` are covered by their own filters
  instead; losing `tips` from search is minor and acceptable.

`schema.prisma` carries `searchVector Unsupported("tsvector")?` so Prisma knows
the column exists; it is never selected or written from app code.

### 2. Pagination — keyset cursor + "Load more"

Every sort mode is reduced to **one ascending numeric key** (`k`, smaller =
earlier) plus the row `id` as a tiebreak:

| sort      | `k`                                                     |
| --------- | ------------------------------------------------------- |
| relevance | `-ts_rank(searchVector, query)`                         |
| recent    | `-extract(epoch from coalesce(publishedAt, createdAt))` |
| budget    | `coalesce(budgetAmount, 2147483647)`                    |
| duration  | `coalesce(durationDays, 2147483647)`                    |

So one cursor shape (`{k, i}`, base64url) and one `WHERE (k, id) > (?, ?)`
pattern cover all sorts — a fast indexed range scan regardless of depth, with
no OFFSET drift when journeys are published mid-browse. The client
(`PaginatedJourneyGrid`) accumulates pages behind a visible "Load more" button;
`/saved` reuses it with Prisma's own cursor pagination (keyed on the composite
PK).

### 3. No month/season filter in v1

Journey dates are optional, so a "trips in April" filter would apply unevenly,
and it's lower-value than budget/duration/style. The filter set is destination,
max budget, max/min days, travel style, transport, and sort. Easy to add later.

### 4. Filter state lives in the URL

`ExploreFilters` reads `useSearchParams` and writes via `router.push`, so a
search is a shareable link and the back button works. The results grid is
remounted (`key`) when the query changes to drop the accumulated list.

## Consequences

- New modules `src/modules/search` and `src/modules/saved`, both reusing
  `CARD_INCLUDE` / `toCardDto` exported from the journeys module.
- `JourneyCardDto` gained `id` and an optional `isSaved`; `SaveButton` (client,
  optimistic) sits on every card and the journey page.
- `/explore` is public; `/saved` and `/journeys/new`/`*/edit` remain
  sign-in-gated in `auth.config.ts`.
- `/explore` and `/journeys/[slug]` stay dynamic (they read `auth()` for the
  save state); turning them into ISR is still a Phase-10 item.
