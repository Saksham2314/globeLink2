import "server-only";

import { Prisma } from "@prisma/client";
import type { UIMessage } from "ai";

import { db } from "@/lib/db";

import { fromStoredMessage, toStoredParts } from "./agent.mappers";

export async function listSessionMessages(sessionId: string): Promise<UIMessage[]> {
  const rows = await db.agentMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(fromStoredMessage);
}

export async function countSessionMessages(sessionId: string): Promise<number> {
  return db.agentMessage.count({ where: { sessionId } });
}

/**
 * Persist the turn's new messages (the user message and the assistant reply,
 * with its tool-call/result parts). System messages are never stored — the
 * system prompt is assembled server-side each turn.
 */
export async function appendSessionMessages(
  sessionId: string,
  messages: UIMessage[],
): Promise<void> {
  const rows = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      sessionId,
      role: m.role === "user" ? ("USER" as const) : ("ASSISTANT" as const),
      parts: toStoredParts(m.parts),
    }));
  if (rows.length === 0) return;
  await db.agentMessage.createMany({ data: rows });
}

/**
 * Patch a persisted assistant message so a stored tool call reflects its final
 * state after the user confirmed or cancelled it — otherwise reloading the
 * session would show the confirmation card as still pending.
 */
export async function resolveToolCallInMessage(
  sessionId: string,
  messageId: string,
  toolCallId: string,
  output: unknown,
): Promise<void> {
  const message = await db.agentMessage.findFirst({ where: { id: messageId, sessionId } });
  if (!message) return;

  const parts = Array.isArray(message.parts) ? (message.parts as Record<string, unknown>[]) : [];
  let hit = false;
  const next = parts.map((part) => {
    if (part && part.toolCallId === toolCallId) {
      hit = true;
      return { ...part, state: "output-available", output, errorText: undefined };
    }
    return part;
  });
  if (!hit) return;

  await db.agentMessage.update({
    where: { id: messageId },
    data: { parts: next as unknown as Prisma.InputJsonValue },
  });
}
