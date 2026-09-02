# ADR 0008 — Personal itineraries (Phase 5)

- **Status:** accepted
- **Date:** 2026-09-02

## Context

Phase 5 gives each traveller private, editable trip plans: a list at
`/itineraries`, a create screen, and a single always-editable page per plan
with a day-by-day builder and a running cost estimate. A plan can be started
from scratch or forked from any published journey. No AI is involved — that is
Phase 6. Two options were put to the project owner; both recommended choices
were taken: a **batch "Save" button** for the plan (like the Phase 2 journey
editor) and a **single always-editable page** (no separate view/edit routes).

## Decisions

### 1. New `Itinerary` / `PlanDay` / `PlanItem` models

A parallel of the journey structure rather than a reuse of `JourneyDay` /
`JourneyStop`: an itinerary is private, mutable and forward-looking, while a
journey is a published, historical write-up. Keeping them separate means plan
items can gain their own fields (a "booked" flag, reservation refs) without
touching the journey schema. `PlanItem.type` reuses the existing `StopType`
enum; new enums `ItineraryStatus` (`DRAFT` / `ACTIVE` / `COMPLETED`) and
`PlanOrigin` (`USER` / `AGENT`, so Phase 6 can mark AI-generated plans) are
added. `Itinerary.sourceJourneyId` is a nullable FK (`onDelete: SetNull`) that
records a fork without creating a dependency.

### 2. The plan is saved whole, in one transaction

`replacePlan` deletes every `PlanDay` for the itinerary and recreates the days
and items from the submitted payload inside `db.$transaction`, then touches
`updatedAt` — identical to the journey editor's `saveItinerary`. Day numbers
and item positions are assigned from array order on save, so reordering in the
client is just array manipulation with no per-row PATCH. The editor holds the
whole plan in React state and posts it via a server action that takes
`payload: unknown` and validates with `planSchema` (max 90 days, 40 items per
day). Metadata (title, destination, dates, status, currency, notes) is a
separate small form with its own action, so a title fix doesn't rewrite the
plan.

### 3. Budget is always derived, never stored

`budgetSummary(days, currency)` is a pure function returning per-day subtotals
and a grand total in integer minor units. The list card and the editor both
call it; there is no cached total to reconcile. Item costs are entered in major
units and converted to minor units by the shared `minorUnits` Zod helper;
invalid input clears the field rather than blocking the save.

### 4. Forking copies structure, not history

`forkFromJourney` loads a **published** journey and creates an itinerary
copying the title, destination, country, currency and the day/item tree, plus
an attribution note ("Forked from @handle's journey."). It deliberately does
**not** copy the journey's `startDate` / `endDate` — a plan is forward-looking,
so dates start empty. Forking a non-published journey is refused.

## Authorization

Every service function calls `loadOwned(userId, id)` first, which throws
**NOT_FOUND** for a missing row and **FORBIDDEN** (via `assertOwnership`) for
someone else's. The `[id]` page treats any throw from `getForEdit` as
`notFound()`, so a non-owner can't tell an itinerary exists. Verified end to
end: a non-owner's `getForEdit` / `updateMeta` / `deleteItinerary` all throw;
`plan_days` and `plan_items` cascade-delete with the itinerary.

## Consequences

- New module `src/modules/itineraries/` (`itinerary.schema`, `budget`,
  `itinerary.mappers`, `itinerary.service`, `itinerary.actions`), same shape as
  earlier phases. `trimmedOptional` / `minorUnits` / `optionalDate` were
  extracted from `journey.schema.ts` into `src/lib/zod-helpers.ts` and are now
  shared.
- Routes: `/itineraries`, `/itineraries/new`, `/itineraries/[id]`. `/itineraries`
  joins the sign-in-gated prefixes in `auth.config.ts`.
- Journey pages get a "Plan my own" button (next to Save / Message) that forks
  into a new itinerary; the user menu gets an "Itineraries" link.
- The `[id]` page is one always-editable screen: a details form, the plan
  builder with live subtotals, and a two-step delete. No publish flow — an
  itinerary is private for its whole life.
- The migration hand-strips the recurring spurious
  `DROP INDEX journeys_search_idx` / `ALTER COLUMN searchVector DROP DEFAULT`
  lines that `prisma migrate diff` emits for the `Unsupported("tsvector")`
  column.
