import "server-only";

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
