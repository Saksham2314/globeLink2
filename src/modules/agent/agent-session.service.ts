import "server-only";

import { Prisma } from "@prisma/client";

import { assertOwnership } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { toSessionDto, type AgentSessionDto } from "./agent.mappers";

const TITLE_MAX = 80;

export async function createSession(userId: string, title?: string): Promise<AgentSessionDto> {
  const s = await db.agentSession.create({
    data: { userId, ...(title ? { title: title.slice(0, TITLE_MAX) } : {}) },
  });
  logger.info({ userId, sessionId: s.id }, "agent session created");
  return toSessionDto(s);
}

/** Owner-scoped load — NOT_FOUND for a missing row *or* someone else's, so a
 *  stranger can't probe which session ids exist. */
export async function getOwnedSession(userId: string, id: string) {
  const s = await db.agentSession.findUnique({ where: { id } });
  if (!s) throw AppError.notFound("Conversation not found");
  assertOwnership(userId, s.userId);
  return s;
}

export async function listSessions(userId: string, limit = 40): Promise<AgentSessionDto[]> {
  const rows = await db.agentSession.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { lastActivityAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });
  return rows.map(toSessionDto);
}

export async function renameSession(userId: string, id: string, title: string): Promise<void> {
  await getOwnedSession(userId, id);
  await db.agentSession.update({
    where: { id },
    data: { title: title.trim().slice(0, TITLE_MAX) || "New chat" },
  });
}

export async function deleteSession(userId: string, id: string): Promise<void> {
  await getOwnedSession(userId, id);
  // Cascades to agent_messages; agent_tool_calls.sessionId is set null.
  await db.agentSession.delete({ where: { id } });
  logger.info({ userId, sessionId: id }, "agent session deleted");
}

/**
 * Post-turn housekeeping. Not owner-checked — the caller (the agent route)
 * has already verified ownership for the request. `state` / `summary` / `title`
 * are each written only when provided.
 */
export async function finalizeTurn(
  id: string,
  patch: { state?: unknown; summary?: string; title?: string } = {},
): Promise<void> {
  await db.agentSession.update({
    where: { id },
    data: {
      lastActivityAt: new Date(),
      ...(patch.state !== undefined ? { state: patch.state as Prisma.InputJsonValue } : {}),
      ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
      ...(patch.title !== undefined ? { title: patch.title.slice(0, TITLE_MAX) } : {}),
    },
  });
}
