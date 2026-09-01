import { z } from "zod";

import { CURRENCIES, STOP_TYPES, TRANSPORT_MODES, TRAVEL_STYLES } from "@/lib/travel-vocab";

const trimmedOptional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const title = z.string().trim().min(3, "Give it a title (3+ characters)").max(120);

/** Major-unit amount in the form → integer minor units (× 100). */
const minorUnits = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v === "" || v === null) return null;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid amount" });
      return z.NEVER;
    }
    return Math.round(n * 100);
  });

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
    startDate: z.coerce.date().optional().nullable(),
    endDate: z.coerce.date().optional().nullable(),
    durationDays: z.coerce.number().int().min(1).max(365).optional().nullable(),
  })
  .refine((v) => !(v.startDate && v.endDate) || v.endDate >= v.startDate, {
    message: "End date can't be before the start date",
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
  type: z.enum(STOP_TYPES).default("ACTIVITY"),
  title: z.string().trim().min(1, "Each stop needs a title").max(120),
  description: trimmedOptional(2_000),
  locationName: trimmedOptional(120),
  cost: minorUnits,
  costCurrency: z.enum(CURRENCIES).optional().nullable(),
});
export type JourneyStopInput = z.infer<typeof journeyStopSchema>;

export const journeyDaySchema = z.object({
  title: trimmedOptional(120),
  date: z.coerce.date().optional().nullable(),
  notes: trimmedOptional(2_000),
  stops: z.array(journeyStopSchema).max(40),
});
export type JourneyDayInput = z.infer<typeof journeyDaySchema>;

export const itinerarySchema = z.object({
  days: z.array(journeyDaySchema).max(60),
});
export type ItineraryInput = z.infer<typeof itinerarySchema>;

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
