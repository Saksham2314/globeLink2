import { formatMoney } from "@/lib/format";

import type { TravelConstraints } from "./constraints.schema";

/**
 * Map extracted constraints onto Explore's URL query params (all strings, the
 * shape `searchParamsSchema` parses). This is the **visible** path: whatever it
 * returns becomes editable filter chips the user can see and change.
 *
 * Kept separate from any future `relevantJourneys(constraints, viewerId)`
 * ranking helper, so itinerary-derived personalization can influence ordering
 * without ever writing private itinerary details into a shareable URL.
 *
 * `month` is intentionally not mapped in Phase 6 — journeys have no month
 * filter yet (see docs/adr/0009).
 */
export function travelConstraintsToSearchParams(c: TravelConstraints): Record<string, string> {
  const params: Record<string, string> = {};

  if (c.destination) params.destination = c.destination;
  else if (c.region) params.q = c.region;

  if (c.durationDays) params.maxDays = String(c.durationDays);
  if (c.maxBudget) params.maxBudget = String(c.maxBudget);
  if (c.styles.length) params.styles = c.styles.join(",");

  return params;
}

/** One-line, human-readable summary of what was understood — shown under the
 *  search box so the interpretation is transparent. */
export function summarizeConstraints(c: TravelConstraints): string {
  const parts: string[] = [];
  if (c.destination) parts.push(c.destination);
  else if (c.region) parts.push(c.region);
  if (c.durationDays) parts.push(`≤ ${c.durationDays} day${c.durationDays === 1 ? "" : "s"}`);
  if (c.maxBudget) {
    parts.push(`under ${formatMoney(c.maxBudget * 100, c.currency ?? "INR") ?? `${c.maxBudget}`}`);
  }
  if (c.month) parts.push(c.month.charAt(0).toUpperCase() + c.month.slice(1));
  if (c.styles.length) parts.push(c.styles.join(", "));
  return parts.join(" · ");
}
