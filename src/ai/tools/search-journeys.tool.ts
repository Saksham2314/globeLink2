import { z } from "zod";

import { TRANSPORT_MODES, TRAVEL_STYLES } from "@/lib/travel-vocab";
import { searchParamsSchema, SORTS } from "@/modules/search/search.schema";
import { searchJourneys } from "@/modules/search/search.service";

import { defineTool } from "./define-tool";
import { toToolJourneyCard } from "./journey-shape";

const input = z
  .object({
    query: z.string().trim().min(1).max(120).optional().describe("Free text — matched against title, summary and description."),
    destination: z.string().trim().min(1).max(80).optional().describe("City or place name."),
    country: z.string().trim().min(1).max(80).optional(),
    maxBudget: z
      .number()
      .int()
      .positive()
      .max(100_000_000)
      .optional()
      .describe("Upper bound on total trip budget, in MAJOR currency units (e.g. 80000)."),
    minDays: z.number().int().positive().max(365).optional(),
    maxDays: z.number().int().positive().max(365).optional().describe("Upper bound on trip length in days."),
    styles: z
      .array(z.enum(TRAVEL_STYLES))
      .max(TRAVEL_STYLES.length)
      .optional()
      .describe("Any of the fixed travel-style vocabulary."),
    transport: z.array(z.enum(TRANSPORT_MODES)).max(TRANSPORT_MODES.length).optional(),
    sort: z.enum(SORTS).optional().describe("Result ordering. Defaults to best text match, else most recent."),
    limit: z.number().int().positive().max(20).optional().describe("Max results (1-20, default 10)."),
  })
  .strict();

export const searchJourneysTool = defineTool({
  name: "searchJourneys",
  description:
    "Search PUBLISHED GlobeLink journeys by destination, budget (major currency units), trip length, travel style and free text. Returns ranked journey cards with slugs. Read-only.",
  kind: "read",
  input,
  async handler(args, ctx) {
    const params = searchParamsSchema.parse({
      q: args.query,
      destination: args.destination,
      country: args.country,
      maxBudget: args.maxBudget?.toString(),
      minDays: args.minDays?.toString(),
      maxDays: args.maxDays?.toString(),
      styles: args.styles?.join(","),
      transport: args.transport?.join(","),
      sort: args.sort,
      limit: (args.limit ?? 10).toString(),
    });

    const { items, nextCursor } = await searchJourneys(params, ctx.userId ?? undefined);
    return {
      count: items.length,
      hasMore: Boolean(nextCursor),
      journeys: items.map(toToolJourneyCard),
    };
  },
});
