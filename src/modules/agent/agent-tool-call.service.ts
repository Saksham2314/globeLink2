import "server-only";

import type { AgentToolCallStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Observability writes for AI tool invocations.
 *
 * The `src/ai` layer never touches Prisma; it records tool calls through this
 * service. `sessionId` / `messageId` stay null until Phase 7 introduces the
 * agent loop and its `AgentSession` / `AgentMessage` tables.
 */

export interface ToolCallRecord {
  userId: string | null;
  toolName: string;
  args: unknown;
  result: unknown;
  status: AgentToolCallStatus;
  latencyMs: number;
  error: string | null;
  sessionId?: string | null;
  messageId?: string | null;
}

/** JSON-safe coercion — a tool's args/result should already be plain data, but
 *  never let a logging failure surface as a tool failure. */
function jsonSafe(value: unknown): object {
  try {
    return JSON.parse(JSON.stringify(value ?? null)) ?? {};
  } catch {
    return {};
  }
}

/** Persist one tool call. Best-effort: a write failure is logged, never thrown. */
export async function recordAgentToolCall(entry: ToolCallRecord): Promise<void> {
  try {
    await db.agentToolCall.create({
      data: {
        sessionId: entry.sessionId ?? null,
        messageId: entry.messageId ?? null,
        userId: entry.userId,
        toolName: entry.toolName,
        args: jsonSafe(entry.args),
        result: jsonSafe(entry.result),
        status: entry.status,
        latencyMs: Math.max(0, Math.round(entry.latencyMs)),
        error: entry.error,
      },
    });
  } catch (err) {
    logger.error({ err, toolName: entry.toolName }, "failed to persist AgentToolCall");
  }
}
