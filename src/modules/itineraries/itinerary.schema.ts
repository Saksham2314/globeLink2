import { z } from "zod";

import { CURRENCIES, STOP_TYPES } from "@/lib/travel-vocab";
import { minorUnits, optionalDate, trimmedOptional } from "@/lib/zod-helpers";

export const ITINERARY_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED"] as const;
export type ItineraryStatusValue = (typeof ITINERARY_STATUSES)[number];

const title = z.string().trim().min(2, "Give it a name").max(120);

export const createItinerarySchema = z.object({
  title,
  destinationName: trimmedOptional(120),
});
export type CreateItineraryInput = z.infer<typeof createItinerarySchema>;

export const itineraryMetaSchema = z
  .object({
    title,
    destinationName: trimmedOptional(120),
    country: trimmedOptional(80),
    startDate: optionalDate,
    endDate: optionalDate,
    status: z
      .union([z.enum(ITINERARY_STATUSES), z.null(), z.undefined()])
      .transform((v) => v ?? "DRAFT"),
    currency: z.union([z.enum(CURRENCIES), z.null(), z.undefined()]).transform((v) => v ?? "INR"),
    notes: trimmedOptional(4000),
  })
  .refine((v) => !(v.startDate && v.endDate) || v.endDate >= v.startDate, {
    message: "The end date can't be before the start date",
    path: ["endDate"],
  });
export type ItineraryMetaInput = z.infer<typeof itineraryMetaSchema>;

// ---------------------------------------------------------------------------
// Plan (nested) — a parallel of the journey itinerary shape, kept separate so
// plan items can gain their own fields (e.g. a "booked" flag) later.
// ---------------------------------------------------------------------------

export const planItemSchema = z.object({
  time: trimmedOptional(40),
  type: z.union([z.enum(STOP_TYPES), z.null(), z.undefined()]).transform((v) => v ?? "ACTIVITY"),
  title: z.string().trim().min(1, "Each item needs a title").max(120),
  description: trimmedOptional(2000),
  locationName: trimmedOptional(120),
  cost: minorUnits,
});
export type PlanItemInput = z.infer<typeof planItemSchema>;

export const planDaySchema = z.object({
  title: trimmedOptional(120),
  date: optionalDate,
  notes: trimmedOptional(2000),
  items: z.array(planItemSchema).max(40),
});
export type PlanDayInput = z.infer<typeof planDaySchema>;

export const planSchema = z.object({
  days: z.array(planDaySchema).max(90),
});
export type PlanInput = z.infer<typeof planSchema>;
