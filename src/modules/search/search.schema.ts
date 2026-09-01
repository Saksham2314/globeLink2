import { z } from "zod";

import { TRANSPORT_MODES, TRAVEL_STYLES } from "@/lib/travel-vocab";

export const SORTS = ["relevance", "recent", "budget", "duration"] as const;
export type SortKey = (typeof SORTS)[number];

export const DEFAULT_LIMIT = 24;
export const MAX_LIMIT = 48;

const csv = <T extends readonly string[]>(allowed: T) =>
  z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter((s): s is T[number] => (allowed as readonly string[]).includes(s))
        : [],
    );

const optionalText = z
  .string()
  .optional()
  .transform((v) => {
    const s = v?.trim();
    return s ? s.slice(0, 80) : undefined;
  });

const positiveInt = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const n = Math.trunc(Number(v));
      return Number.isFinite(n) && n > 0 && n <= max ? n : undefined;
    });

/**
 * Parses raw `URLSearchParams` (as a record) into a validated, clamped query.
 * Anything unrecognised is dropped rather than erroring — a search URL should
 * never 400.
 */
export const searchParamsSchema = z.object({
  q: z
    .string()
    .optional()
    .transform((v) => {
      const s = v?.trim();
      return s ? s.slice(0, 120) : undefined;
    }),
  destination: optionalText,
  country: optionalText,
  /** Major currency units in the URL; the service converts to minor units. */
  maxBudget: positiveInt(100_000_000),
  minDays: positiveInt(365),
  maxDays: positiveInt(365),
  styles: csv(TRAVEL_STYLES),
  transport: csv(TRANSPORT_MODES),
  sort: z
    .string()
    .optional()
    .transform((v): SortKey =>
      (SORTS as readonly string[]).includes(v ?? "") ? (v as SortKey) : "relevance",
    ),
  cursor: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = Math.trunc(Number(v));
      return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_LIMIT) : DEFAULT_LIMIT;
    }),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

/** Does this query actually constrain anything? Used for the empty state copy. */
export function hasActiveFilters(p: SearchParams): boolean {
  return Boolean(
    p.q ||
    p.destination ||
    p.country ||
    p.maxBudget ||
    p.minDays ||
    p.maxDays ||
    p.styles.length ||
    p.transport.length,
  );
}
