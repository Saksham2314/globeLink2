import { z } from "zod";

import { AppError, isAppError } from "@/lib/errors";
import { ITINERARY_STATUSES } from "@/modules/itineraries/itinerary.schema";
import {
  getForEdit,
  listMine,
  replacePlan,
  updateMeta,
  updateStatus,
} from "@/modules/itineraries/itinerary.service";
import { assertMutationAllowed, recordAudit } from "@/modules/agent/audit.service";
import { STOP_TYPES } from "@/lib/travel-vocab";

import { defineTool } from "./define-tool";
import type { ItineraryEditDto } from "@/modules/itineraries/itinerary.mappers";

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
    itinerary: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe("The itinerary's id, or its title if the id isn't known."),
    title: z.string().trim().min(2).max(120).optional(),
    destination: z.string().trim().max(120).optional(),
    country: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(4000).optional(),
    status: z.enum(ITINERARY_STATUSES).optional(),
    days: z.array(dayInput).max(30).optional().describe("Replaces the whole day-by-day plan."),
  })
  .strict();

async function resolve(userId: string, ref: string): Promise<ItineraryEditDto> {
  try {
    return await getForEdit(userId, ref);
  } catch (err) {
    if (!isAppError(err) || err.code !== "NOT_FOUND") throw err;
  }
  const { items } = await listMine(userId, { limit: 48 });
  const match =
    items.find((i) => i.title.toLowerCase() === ref.toLowerCase()) ??
    items.find((i) => i.title.toLowerCase().includes(ref.toLowerCase()));
  if (!match) throw AppError.notFound(`No itinerary matches "${ref}".`);
  return getForEdit(userId, match.id);
}

export const updateItineraryTool = defineTool({
  name: "updateItinerary",
  description:
    "Change one of the signed-in user's own itineraries — its title, destination, notes, status, or the whole day plan. Requires the user to confirm; the changes are shown first.",
  kind: "mutate",
  confirm: true,
  input,
  async handler(args, ctx) {
    if (!ctx.userId) throw AppError.unauthorized("Sign in to edit an itinerary.");
    await assertMutationAllowed({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      action: "updateItinerary",
    });

    const current = await resolve(ctx.userId, args.itinerary);
    const id = current.id;
    const changed: string[] = [];

    const metaTouched =
      args.title !== undefined ||
      args.destination !== undefined ||
      args.country !== undefined ||
      args.notes !== undefined ||
      args.status !== undefined;

    if (metaTouched) {
      await updateMeta(ctx.userId, id, {
        title: args.title ?? current.title,
        destinationName: args.destination ?? current.destinationName,
        country: args.country ?? current.country,
        startDate: current.startDate,
        endDate: current.endDate,
        status: args.status ?? current.status,
        currency: current.currency,
        notes: args.notes ?? current.notes,
      });
      if (args.title !== undefined) changed.push("title");
      if (args.destination !== undefined) changed.push("destination");
      if (args.country !== undefined) changed.push("country");
      if (args.notes !== undefined) changed.push("notes");
      if (args.status !== undefined) changed.push("status");
    } else if (args.status !== undefined) {
      await updateStatus(ctx.userId, id, args.status);
      changed.push("status");
    }

    if (args.days?.length) {
      await replacePlan(ctx.userId, id, {
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
      changed.push("day plan");
    }

    if (changed.length === 0) throw AppError.badRequest("Nothing to change was provided.");

    await recordAudit({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      action: "updateItinerary",
      targetType: "itinerary",
      targetId: id,
      summary: `Updated ${changed.join(", ")} on "${args.title ?? current.title}"`,
    });

    return { itineraryId: id, changed, url: `/itineraries/${id}` };
  },
});
