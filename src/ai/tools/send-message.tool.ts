import { z } from "zod";

import { AppError } from "@/lib/errors";
import { assertMutationAllowed, recordAudit } from "@/modules/agent/audit.service";
import { getPublishedJourneyRef } from "@/modules/journeys/journey.service";
import { getOrCreateConversation, sendMessage } from "@/modules/messaging/messaging.service";
import { getUserIdByHandle } from "@/modules/users/user.service";

import { defineTool } from "./define-tool";

const input = z
  .object({
    body: z.string().trim().min(1).max(4000).describe("The exact message text to send."),
    journeySlug: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .optional()
      .describe("Send to the author of this published journey."),
    recipientHandle: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .optional()
      .describe("Send to the user with this @handle. Provide this or journeySlug."),
  })
  .strict()
  .refine((v) => Boolean(v.journeySlug || v.recipientHandle), {
    message: "Provide journeySlug or recipientHandle",
  });

export const sendMessageTool = defineTool({
  name: "sendMessage",
  description:
    "Send a direct message from the signed-in user to a journey's author or a user by @handle. Always requires confirmation, and the exact text is shown before it is sent. Cannot be undone.",
  kind: "mutate",
  confirm: true,
  input,
  async handler(args, ctx) {
    if (!ctx.userId) throw AppError.unauthorized("Sign in to send a message.");
    await assertMutationAllowed({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      action: "sendMessage",
    });

    let recipientId: string | null = null;
    let journeyId: string | undefined;
    let recipientLabel: string;

    if (args.journeySlug) {
      const journey = await getPublishedJourneyRef(args.journeySlug);
      if (!journey) throw AppError.notFound("That journey isn't available.");
      recipientId = journey.authorId;
      journeyId = journey.id;
      recipientLabel = `the author of "${journey.title}"`;
    } else {
      recipientId = await getUserIdByHandle(args.recipientHandle!);
      recipientLabel = `@${args.recipientHandle}`;
    }
    if (!recipientId) throw AppError.notFound("Couldn't find that person.");
    if (recipientId === ctx.userId) throw AppError.badRequest("You can't message yourself.");

    const { id: conversationId } = await getOrCreateConversation(ctx.userId, recipientId, {
      journeyId,
    });
    await sendMessage(ctx.userId, conversationId, { body: args.body });

    await recordAudit({
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      action: "sendMessage",
      targetType: "conversation",
      targetId: conversationId,
      summary: `Sent a message to ${recipientLabel}`,
    });

    return { conversationId, recipient: recipientLabel, url: `/messages/${conversationId}` };
  },
});
