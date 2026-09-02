import { z } from "zod";

import { AppError } from "@/lib/errors";
import { getPublicJourneyDetail } from "@/modules/journeys/journey.service";

import { defineTool } from "./define-tool";
import { toToolJourneyDetail } from "./journey-shape";

const input = z
  .object({
    idOrSlug: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe("A journey slug (from a search result) or its id."),
  })
  .strict();

export const getJourneyTool = defineTool({
  name: "getJourney",
  description:
    "Fetch one PUBLISHED journey in full: overview, day-by-day stops with locations and costs (major currency units), tips and budget. Accepts a slug or id. Read-only.",
  kind: "read",
  input,
  async handler(args, ctx) {
    const journey = await getPublicJourneyDetail(args.idOrSlug, ctx.userId ?? undefined);
    if (!journey) throw AppError.notFound("No published journey matches that id or slug.");
    return toToolJourneyDetail(journey);
  },
});
