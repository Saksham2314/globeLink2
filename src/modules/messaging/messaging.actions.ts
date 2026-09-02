"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AppError, isAppError } from "@/lib/errors";
import { firstErrors, type FormState } from "@/lib/forms";
import { logger } from "@/lib/logger";

import { sendMessageSchema, startConversationSchema } from "./messaging.schema";
import { getOrCreateConversation, listMessages, markRead, sendMessage } from "./messaging.service";
import type { MessageDto } from "./messaging.mappers";

async function actorId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw AppError.unauthorized("Please sign in again");
  return id;
}

/** From the "Message" button on a journey. Opens (or creates) the thread. */
export async function startConversationAction(formData: FormData): Promise<void> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    redirect("/login");
  }

  const parsed = startConversationSchema.safeParse({
    recipientId: formData.get("recipientId"),
    journeyId: formData.get("journeyId") ?? undefined,
  });
  if (!parsed.success) redirect("/explore");

  let conversationId: string;
  try {
    ({ id: conversationId } = await getOrCreateConversation(userId, parsed.data.recipientId, {
      journeyId: parsed.data.journeyId,
    }));
  } catch (error) {
    logger.error({ err: error }, "startConversation failed");
    redirect("/messages");
  }

  redirect(`/messages/${conversationId}`);
}

export interface SendMessageState extends FormState {
  sentMessage?: MessageDto;
}

export async function sendMessageAction(
  conversationId: string,
  _prev: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  let userId: string;
  try {
    userId = await actorId();
  } catch {
    return { error: "Please sign in again." };
  }

  const parsed = sendMessageSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  try {
    const message = await sendMessage(userId, conversationId, parsed.data);
    revalidatePath("/messages");
    return { ok: true, sentMessage: message };
  } catch (error) {
    if (isAppError(error) && error.expose) return { error: error.message };
    logger.error({ err: error }, "sendMessage failed");
    return { error: "Couldn't send that. Try again." };
  }
}

export async function markReadAction(conversationId: string): Promise<{ ok: boolean }> {
  try {
    await markRead(await actorId(), conversationId);
    revalidatePath("/messages");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function loadOlderMessagesAction(
  conversationId: string,
  before: string,
): Promise<{ messages: MessageDto[]; olderCursor: string | null }> {
  try {
    return await listMessages(await actorId(), conversationId, { before });
  } catch (error) {
    logger.error({ err: error }, "loadOlderMessages failed");
    return { messages: [], olderCursor: null };
  }
}
