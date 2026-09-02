import "server-only";

import type { AgentRunOutcome } from "@prisma/client";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Per-turn observability for the assistant: one `AgentRun` row per `/api/agent`
 * request that reached the model. Complements `AgentToolCall` (per invocation)
 * and `AuditLog` (per data change). `totalTokens` here also backs the per-user
 * daily token budget the route enforces before streaming.
 */

export interface AgentRunRecord {
  sessionId?: string | null;
  userId?: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  steps: number;
  toolNames: string[];
  latencyMs: number;
  outcome: AgentRunOutcome;
  error?: string | null;
}

const int = (n: number | undefined | null) => Math.max(0, Math.round(Number(n) || 0));

/** Persist one run. Best-effort: a write failure is logged, never thrown. */
export async function recordAgentRun(entry: AgentRunRecord): Promise<void> {
  try {
    await db.agentRun.create({
      data: {
        sessionId: entry.sessionId ?? null,
        userId: entry.userId ?? null,
        model: entry.model,
        inputTokens: int(entry.inputTokens),
        outputTokens: int(entry.outputTokens),
        totalTokens: int(entry.totalTokens),
        steps: int(entry.steps),
        toolNames: entry.toolNames.slice(0, 24),
        latencyMs: int(entry.latencyMs),
        outcome: entry.outcome,
        error: entry.error ? entry.error.slice(0, 500) : null,
      },
    });
  } catch (err) {
    logger.error({ err, sessionId: entry.sessionId }, "failed to persist AgentRun");
  }
}

const DAY_MS = 86_400_000;

/**
 * Total tokens this user has spent on the assistant in the last 24h. Used to
 * enforce `DAILY_TOKEN_BUDGET` before a turn streams. Fail-open: returns 0 on a
 * query error so a metering hiccup never locks a user out.
 */
export async function getTokensUsedToday(userId: string): Promise<number> {
  try {
    const agg = await db.agentRun.aggregate({
      _sum: { totalTokens: true },
      where: { userId, createdAt: { gte: new Date(Date.now() - DAY_MS) } },
    });
    return agg._sum.totalTokens ?? 0;
  } catch (err) {
    logger.error({ err, userId }, "getTokensUsedToday failed; allowing the turn");
    return 0;
  }
}

export interface RecentRun {
  id: string;
  model: string;
  totalTokens: number;
  steps: number;
  toolNames: string[];
  latencyMs: number;
  outcome: AgentRunOutcome;
  createdAt: string;
}

/** Most recent runs for the signed-in user — the read-only Settings activity list. */
export async function listRecentRuns(userId: string, limit = 15): Promise<RecentRun[]> {
  const rows = await db.agentRun.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 50),
  });
  return rows.map((r) => ({
    id: r.id,
    model: r.model,
    totalTokens: r.totalTokens,
    steps: r.steps,
    toolNames: r.toolNames,
    latencyMs: r.latencyMs,
    outcome: r.outcome,
    createdAt: r.createdAt.toISOString(),
  }));
}
