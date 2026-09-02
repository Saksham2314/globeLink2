import "server-only";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * The audit trail for assistant-driven mutations, plus the mutation rate caps
 * (both counts are read from `audit_logs`). Written after a mutation succeeds.
 */

/** Max mutations the assistant may make within one conversation. */
export const MAX_MUTATIONS_PER_SESSION = 20;

/** Per-tool caps over a rolling 24h, per user. */
export const DAILY_TOOL_CAP: Readonly<Record<string, number>> = {
  sendMessage: 8,
};

const DAY_MS = 86_400_000;

export type AuditAction = "saveJourney" | "createItinerary" | "updateItinerary" | "sendMessage";

export interface AuditEntry {
  userId: string;
  sessionId?: string | null;
  action: AuditAction;
  targetType: "journey" | "itinerary" | "conversation";
  targetId: string;
  summary: string;
}

/** Best-effort — a failed audit write must not fail the mutation it records. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId,
        sessionId: entry.sessionId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        summary: entry.summary.slice(0, 500),
      },
    });
  } catch (err) {
    logger.error({ err, action: entry.action }, "recordAudit failed");
  }
}

/**
 * Throws `RATE_LIMITED` when a mutation would exceed a cap. Called at the top
 * of every mutating tool handler, so the tool factory turns it into a normal
 * `{ ok: false, error }` the model can relay.
 */
export async function assertMutationAllowed(params: {
  userId: string;
  sessionId?: string | null;
  action: AuditAction;
}): Promise<void> {
  if (params.sessionId) {
    const inSession = await db.auditLog.count({ where: { sessionId: params.sessionId } });
    if (inSession >= MAX_MUTATIONS_PER_SESSION) {
      throw AppError.rateLimited(
        "This conversation has reached its limit of changes. Start a new chat to continue.",
      );
    }
  }

  const cap = DAILY_TOOL_CAP[params.action];
  if (cap != null) {
    const today = await db.auditLog.count({
      where: {
        userId: params.userId,
        action: params.action,
        createdAt: { gte: new Date(Date.now() - DAY_MS) },
      },
    });
    if (today >= cap) {
      throw AppError.rateLimited(
        `You've hit today's limit for this action (${cap}). Try again tomorrow.`,
      );
    }
  }
}

export function countSessionMutations(sessionId: string): Promise<number> {
  return db.auditLog.count({ where: { sessionId } });
}
