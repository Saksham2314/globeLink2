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
  const message = await findToolCallMessage(sessionId, messageId, toolCallId);
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
    where: { id: message.id },
    data: { parts: next as unknown as Prisma.InputJsonValue },
  });
}

/** Has this stored tool call already been confirmed or cancelled? Used to stop
 *  the same proposal from running twice (double click, stale tab, reload). */
export async function isToolCallResolved(
  sessionId: string,
  messageId: string,
  toolCallId: string,
): Promise<boolean> {
  const message = await findToolCallMessage(sessionId, messageId, toolCallId);
  return Boolean(message && toolCallPart(message.parts, toolCallId)?.state === "output-available");
}

/**
 * In a live chat the client only knows the streamed message's id, while the
 * stored row got its own on insert — so fall back to finding the message by its
 * (unique) tool call id among the session's recent assistant messages.
 */
async function findToolCallMessage(sessionId: string, messageId: string, toolCallId: string) {
  const byId = await db.agentMessage.findFirst({ where: { id: messageId, sessionId } });
  if (byId && toolCallPart(byId.parts, toolCallId)) return byId;
  const recent = await db.agentMessage.findMany({
    where: { sessionId, role: "ASSISTANT" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return recent.find((m) => toolCallPart(m.parts, toolCallId)) ?? null;
}

function toolCallPart(parts: Prisma.JsonValue, toolCallId: string) {
  if (!Array.isArray(parts)) return undefined;
  return parts.find(
    (p): p is Prisma.JsonObject =>
      typeof p === "object" && p !== null && !Array.isArray(p) && p.toolCallId === toolCallId,
  );
}
