import { z } from "zod";

import { AppError } from "@/lib/errors";
import { assertMutationAllowed, recordAudit } from "@/modules/agent/audit.service";
import { getPublishedJourneyRef } from "@/modules/journeys/journey.service";
import { toggleSave } from "@/modules/saved/saved.service";

import { defineTool } from "./define-tool";

const input = z
  .object({
    slug: z.string().trim().min(1).max(200).describe("A journey slug from a search result."),
  })
  .strict();

export const saveJourneyTool = defineTool({
  name: "saveJourney",
  description:
    "Bookmark a published journey to the signed-in user's saved list (or remove it if already saved). Runs immediately — it is a single reversible tap, no confirmation needed.",
  kind: "mutate",
  confirm: false,
  input,
  async handler(args, ctx) {
    if (!ctx.userId) throw AppError.unauthorized("Sign in to save journeys.");
    await assertMutationAllowed({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      action: "saveJourney",
    });

    const journey = await getPublishedJourneyRef(args.slug);
    if (!journey) throw AppError.notFound("That journey isn't available.");

    const { saved } = await toggleSave(ctx.userId, journey.id);
    await recordAudit({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      action: "saveJourney",
      targetType: "journey",
      targetId: journey.id,
      summary: `${saved ? "Saved" : "Unsaved"} "${journey.title}"`,
    });

    return { saved, title: journey.title, slug: journey.slug };
  },
});
