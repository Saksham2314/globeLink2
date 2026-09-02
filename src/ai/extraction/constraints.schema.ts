import { z } from "zod";

import { CURRENCIES, TRAVEL_STYLES } from "@/lib/travel-vocab";

/**
 * `TravelConstraints` — a normalized, reusable description of what a user wants
 * from a trip. Phase 6 fills it from a search phrase (`fromMessage`). It is
 * deliberately the same shape that a future `fromItinerary(itinerary)` will
 * produce, so itinerary-aware discovery and journey-mining reuse this type and
 * the mappers below rather than inventing parallel ones.
 *
 * Every scalar is nullable (present, possibly null) so the model's structured
 * output is deterministic across providers. Nothing here is persisted.
 */

export const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;
export type Month = (typeof MONTHS)[number];

export const travelConstraintsSchema = z.object({
  destination: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .nullable()
    .describe("A city or specific place, e.g. 'Kyoto'. Null if not stated."),
  region: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .nullable()
    .describe("A broader region, state or country, e.g. 'Rajasthan'. Null if not stated."),
  durationDays: z
    .number()
    .int()
    .min(1)
    .max(365)
    .nullable()
    .describe("Trip length in days. Convert weeks (1 week = 7). Null if not stated."),
  maxBudget: z
    .number()
    .int()
    .positive()
    .max(100_000_000)
    .nullable()
    .describe("Total budget ceiling as a plain number in MAJOR currency units (80000, not '80k'). Null if not stated."),
  currency: z
    .enum(CURRENCIES)
    .nullable()
    .describe("ISO code for maxBudget. Use INR for a ₹ amount; null if no amount or unclear."),
  month: z
    .enum(MONTHS)
    .nullable()
    .describe("Month of travel if stated (lowercase English). Null otherwise."),
  styles: z
    .array(z.enum(TRAVEL_STYLES))
    .max(TRAVEL_STYLES.length)
    .describe("Matching travel styles from the fixed vocabulary. Empty array if none apply."),
});

export type TravelConstraints = z.infer<typeof travelConstraintsSchema>;

/**
 * The permissive shape the model actually fills. Small models occasionally
 * invent an out-of-vocabulary style ("beach") or a loose type; a strict schema
 * would make `generateObject` throw the whole (mostly good) result away.
 * `sanitizeConstraints` narrows this to `TravelConstraints`, dropping anything
 * that does not fit.
 */
export const rawExtractionSchema = z.object({
  destination: z.string().nullable(),
  region: z.string().nullable(),
  durationDays: z.number().nullable(),
  maxBudget: z.number().nullable(),
  currency: z.string().nullable(),
  month: z.string().nullable(),
  styles: z.array(z.string()),
});
export type RawExtraction = z.infer<typeof rawExtractionSchema>;

const CURRENCY_SET = new Set<string>(CURRENCIES);
const STYLE_SET = new Set<string>(TRAVEL_STYLES);
const MONTH_SET = new Set<string>(MONTHS);

const asInt = (n: number | null, min: number, max: number): number | null => {
  if (n == null || !Number.isFinite(n)) return null;
  const v = Math.round(n);
  return v >= min && v <= max ? v : null;
};

const asText = (s: string | null, max: number): string | null => {
  const t = s?.trim();
  return t ? t.slice(0, max) : null;
};

/** Coerce a loose model result into the canonical `TravelConstraints`. Never
 *  throws; unknown/invalid values become null (or are dropped, for styles). */
export function sanitizeConstraints(raw: RawExtraction): TravelConstraints {
  const currency = raw.currency?.trim().toUpperCase();
  const month = raw.month?.trim().toLowerCase();
  return {
    destination: asText(raw.destination, 80),
    region: asText(raw.region, 80),
    durationDays: asInt(raw.durationDays, 1, 365),
    maxBudget: asInt(raw.maxBudget, 1, 100_000_000),
    currency: currency && CURRENCY_SET.has(currency) ? (currency as TravelConstraints["currency"]) : null,
    month: month && MONTH_SET.has(month) ? (month as TravelConstraints["month"]) : null,
    styles: [
      ...new Set(raw.styles.map((s) => s.trim().toLowerCase()).filter((s) => STYLE_SET.has(s))),
    ].slice(0, TRAVEL_STYLES.length) as TravelConstraints["styles"],
  };
}

export const EMPTY_CONSTRAINTS: TravelConstraints = {
  destination: null,
  region: null,
  durationDays: null,
  maxBudget: null,
  currency: null,
  month: null,
  styles: [],
};

/** Does this actually constrain a search? */
export function hasAnyConstraint(c: TravelConstraints): boolean {
  return Boolean(
    c.destination || c.region || c.durationDays || c.maxBudget || c.month || c.styles.length,
  );
}
