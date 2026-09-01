import { z } from "zod";

import { TRAVEL_STYLES } from "@/lib/travel-vocab";

import { HANDLE_PATTERN } from "./handle";

/**
 * Fixed vocabularies for travel preferences. Kept as plain text (not Postgres
 * enums) so the lists can evolve without a migration; these schemas are the
 * gate. `TRAVEL_STYLES` is shared with journeys, so it lives in lib/travel-vocab.
 */
export { TRAVEL_STYLES } from "@/lib/travel-vocab";

export const TRAVEL_PACES = ["relaxed", "balanced", "packed"] as const;

export const BUDGET_TIERS = ["shoestring", "moderate", "comfort", "luxury"] as const;

export const INTERESTS = [
  "food",
  "history",
  "art",
  "hiking",
  "wildlife",
  "beaches",
  "nightlife",
  "photography",
  "architecture",
  "wellness",
  "festivals",
  "shopping",
] as const;

export const DIETARY = ["vegetarian", "vegan", "halal", "kosher", "gluten-free", "none"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(HANDLE_PATTERN, "3–20 characters: lowercase letters, numbers and hyphens"),
  bio: optionalText(400),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updatePreferencesSchema = z.object({
  styles: z.array(z.enum(TRAVEL_STYLES)).max(TRAVEL_STYLES.length),
  pace: z.enum(TRAVEL_PACES).nullish(),
  budgetTier: z.enum(BUDGET_TIERS).nullish(),
  interests: z.array(z.enum(INTERESTS)).max(INTERESTS.length),
  dietary: z.array(z.enum(DIETARY)).max(DIETARY.length),
  homeRegion: optionalText(80),
});
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
