import { z } from "zod";

import { CURRENCIES, STOP_TYPES, TRANSPORT_MODES, TRAVEL_STYLES } from "@/lib/travel-vocab";
import { minorUnits, optionalDate, trimmedOptional } from "@/lib/zod-helpers";

const title = z.string().trim().min(3, "Give it a title (3+ characters)").max(120);

/** End of the current day — the latest a "completed trip" date may be. */
function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

// ---------------------------------------------------------------------------
// Section schemas — each maps to one form on the edit page.
// ---------------------------------------------------------------------------

export const createJourneySchema = z.object({
  title,
  destinationName: trimmedOptional(120),
});
export type CreateJourneyInput = z.infer<typeof createJourneySchema>;

export const journeyBasicsSchema = z.object({
  title,
  summary: trimmedOptional(280),
  originName: trimmedOptional(120),
  destinationName: trimmedOptional(120),
  country: trimmedOptional(80),
  region: trimmedOptional(80),
});
export type JourneyBasicsInput = z.infer<typeof journeyBasicsSchema>;

export const journeyRouteSchema = z
  .object({
    startDate: optionalDate,
    endDate: optionalDate,
    durationDays: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((v) => {
      if (v === null || v === undefined || v === "") return null;
      const n = Math.trunc(Number(v));
      return Number.isFinite(n) && n >= 1 && n <= 365 ? n : null;
    }),
  })
  .refine((v) => !(v.startDate && v.endDate) || v.endDate >= v.startDate, {
    message: "The end date can't be before the start date",
    path: ["endDate"],
  })
  .refine((v) => !v.startDate || v.startDate <= endOfToday(), {
    message: "This is for trips you've already taken — the start date can't be in the future",
    path: ["startDate"],
  })
  .refine((v) => !v.endDate || v.endDate <= endOfToday(), {
    message: "The end date can't be in the future",
    path: ["endDate"],
  });
export type JourneyRouteInput = z.infer<typeof journeyRouteSchema>;

export const journeyBudgetSchema = z.object({
  budgetAmount: minorUnits,
  budgetCurrency: z.enum(CURRENCIES).default("INR"),
  transportModes: z.array(z.enum(TRANSPORT_MODES)).max(TRANSPORT_MODES.length),
  travelStyle: z.array(z.enum(TRAVEL_STYLES)).max(TRAVEL_STYLES.length),
});
export type JourneyBudgetInput = z.infer<typeof journeyBudgetSchema>;

export const journeyContentSchema = z.object({
  description: trimmedOptional(20_000),
  tips: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
});
export type JourneyContentInput = z.infer<typeof journeyContentSchema>;

// ---------------------------------------------------------------------------
// Itinerary — nested, saved as one JSON payload (not FormData).
// ---------------------------------------------------------------------------

export const journeyStopSchema = z.object({
  time: trimmedOptional(40),
  type: z.union([z.enum(STOP_TYPES), z.null(), z.undefined()]).transform((v) => v ?? "ACTIVITY"),
  title: z.string().trim().min(1, "Each stop needs a title").max(120),
  description: trimmedOptional(2_000),
  locationName: trimmedOptional(120),
  cost: minorUnits,
  costCurrency: z.union([z.enum(CURRENCIES), z.null(), z.undefined()]).transform((v) => v ?? null),
});
export type JourneyStopInput = z.infer<typeof journeyStopSchema>;

export const journeyDaySchema = z.object({
  title: trimmedOptional(120),
  date: optionalDate,
  notes: trimmedOptional(2_000),
  stops: z.array(journeyStopSchema).max(40),
});
export type JourneyDayInput = z.infer<typeof journeyDaySchema>;

export const itinerarySchema = z.object({
  days: z.array(journeyDaySchema).max(60),
});
export type ItineraryInput = z.infer<typeof itinerarySchema>;

/**
 * Business rule for per-day dates: never in the future, and — when the trip has
 * a start/end — within that window. Returns a user-facing message, or null when
 * everything checks out.
 */
export function checkItineraryDates(
  days: { date: Date | null }[],
  tripStart: Date | null,
  tripEnd: Date | null,
): string | null {
  const latest = endOfToday();
  for (const [i, day] of days.entries()) {
    if (!day.date) continue;
    if (day.date > latest) return `Day ${i + 1}'s date can't be in the future`;
    if (tripStart && day.date < startOfDay(tripStart)) {
      return `Day ${i + 1}'s date is before the trip's start date`;
    }
    if (tripEnd && day.date > endOfDay(tripEnd)) {
      return `Day ${i + 1}'s date is after the trip's end date`;
    }
  }
  return null;
}

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

// ---------------------------------------------------------------------------
// Publish readiness — a checklist, not a hard schema, so the UI can show
// exactly what's missing.
// ---------------------------------------------------------------------------

export interface PublishRequirement {
  key: string;
  label: string;
  met: boolean;
}

export function publishRequirements(j: {
  title: string | null;
  destinationName: string | null;
  summary: string | null;
  description: string | null;
  startDate: Date | null;
  durationDays: number | null;
}): PublishRequirement[] {
  return [
    { key: "title", label: "A title", met: Boolean(j.title && j.title.trim().length >= 3) },
    {
      key: "destination",
      label: "A destination",
      met: Boolean(j.destinationName && j.destinationName.trim()),
    },
    {
      key: "story",
      label: "A summary or a description",
      met: Boolean(j.summary?.trim() || j.description?.trim()),
    },
    {
      key: "duration",
      label: "Trip length (dates or number of days)",
      met: Boolean(j.startDate || j.durationDays),
    },
  ];
}

export const isPublishable = (j: Parameters<typeof publishRequirements>[0]): boolean =>
  publishRequirements(j).every((r) => r.met);
