import { z } from "zod";

import { AppError } from "@/lib/errors";
import { STOP_TYPES } from "@/lib/travel-vocab";
import { assertMutationAllowed, recordAudit } from "@/modules/agent/audit.service";
import {
  createItinerary,
  forkFromJourney,
  replacePlan,
} from "@/modules/itineraries/itinerary.service";
import { getPublishedJourneyRef } from "@/modules/journeys/journey.service";

import { defineTool } from "./define-tool";

const dayInput = z.object({
  title: z.string().trim().max(120).optional(),
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        time: z.string().trim().max(40).optional(),
        type: z.enum(STOP_TYPES).optional(),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .max(20),
});

const input = z
  .object({
    title: z.string().trim().min(2).max(120).describe("A name for the itinerary."),
    fromJourneySlug: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .optional()
      .describe(
        "Slug of a published journey to fork — copies its destination and day plan. When set, `days` is ignored.",
      ),
    destination: z.string().trim().min(1).max(120).optional(),
    days: z
      .array(dayInput)
      .max(30)
      .optional()
      .describe("An optional day-by-day plan to start with."),
  })
  .strict();

export const createItineraryTool = defineTool({
  name: "createItinerary",
  description:
    "Create a new private itinerary for the signed-in user — optionally forked from a published journey, or with a starting day plan. Requires the user to confirm; the exact plan is shown before it is created.",
  kind: "mutate",
  confirm: true,
  input,
  async handler(args, ctx) {
    if (!ctx.userId) throw AppError.unauthorized("Sign in to create an itinerary.");
    await assertMutationAllowed({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      action: "createItinerary",
    });

    let itineraryId: string;
    let title = args.title;

    if (args.fromJourneySlug) {
      const journey = await getPublishedJourneyRef(args.fromJourneySlug);
      if (!journey) throw AppError.notFound("That journey isn't available to fork.");
      ({ id: itineraryId } = await forkFromJourney(ctx.userId, journey.slug));
      title = journey.title;
    } else {
      ({ id: itineraryId } = await createItinerary(ctx.userId, {
        title: args.title,
        destinationName: args.destination ?? null,
      }));
      if (args.days?.length) {
        await replacePlan(ctx.userId, itineraryId, {
          days: args.days.map((d) => ({
            title: d.title ?? null,
            date: null,
            notes: null,
            items: d.items.map((it) => ({
              time: it.time ?? null,
              type: it.type ?? "ACTIVITY",
              title: it.title,
              description: it.note ?? null,
              locationName: null,
              cost: null,
            })),
          })),
        });
      }
    }

    await recordAudit({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      action: "createItinerary",
      targetType: "itinerary",
      targetId: itineraryId,
      summary: `Created itinerary "${title}"${args.fromJourneySlug ? " (forked)" : ""}`,
    });

    return { itineraryId, title, url: `/itineraries/${itineraryId}` };
  },
});
