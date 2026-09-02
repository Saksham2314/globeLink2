import { after } from "next/server";
import type { UIMessage } from "ai";

import { refreshSummary } from "@/ai/agent/summary";
import {
  messagesToPlainText,
  shouldRefreshSummary,
  windowMessages,
} from "@/ai/agent/context-window";
import { streamAgentReply } from "@/ai/agent/orchestrator";
import { generateSessionTitle } from "@/ai/agent/title";
import { AGENT_MODEL_ID } from "@/ai/provider";
import { auth } from "@/lib/auth";
import { isAiEnabled } from "@/lib/env";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  appendSessionMessages,
  countSessionMessages,
  listSessionMessages,
} from "@/modules/agent/agent-message.service";
import { getTokensUsedToday, recordAgentRun } from "@/modules/agent/agent-run.service";
import { finalizeTurn, getOwnedSession } from "@/modules/agent/agent-session.service";
import { agentRequestSchema, userMessageText } from "@/modules/agent/agent.schema";

export const runtime = "nodejs";
export const maxDuration = 60;

// Per-user request rate limit. In-memory: resets on cold start, which is an
// acceptable ceiling for a soft limit.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 12;
const recentHits = new Map<string, number[]>();

/** Per-user cap on assistant tokens over a rolling 24h. Generous — dozens of
 *  turns — so it only catches runaway/abusive use, not normal sessions. */
const DAILY_TOKEN_BUDGET = 200_000;

/** Report a stream failure to Sentry when it's configured. Dynamic + guarded so
 *  `@sentry/nextjs` stays out of this route's bundle when Sentry is off. */
function captureAgentError(err: unknown, sessionId: string): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  void import("@sentry/nextjs")
    .then((Sentry) =>
      Sentry.captureException(err, { tags: { area: "agent-stream" }, extra: { sessionId } }),
    )
    .catch(() => {});
}

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const hits = (recentHits.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  recentHits.set(userId, hits);
  return hits.length > RATE_MAX;
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  if (!isAiEnabled) {
    return Response.json({ error: "The assistant is not available right now." }, { status: 503 });
  }
  if (isRateLimited(userId)) {
    return Response.json(
      { error: "You're sending messages too quickly — give it a few seconds." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const parsed = agentRequestSchema.safeParse(body);
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const { sessionId, message } = parsed.data;

  let priorSummary: string | null;
  try {
    ({ summary: priorSummary } = await getOwnedSession(userId, sessionId));
  } catch (err) {
    const code = isAppError(err) && err.code === "NOT_FOUND" ? 404 : 403;
    return new Response(code === 404 ? "Not found" : "Forbidden", { status: code });
  }

  if ((await getTokensUsedToday(userId)) >= DAILY_TOKEN_BUDGET) {
    after(() =>
      recordAgentRun({
        sessionId,
        userId,
        model: AGENT_MODEL_ID,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        steps: 0,
        toolNames: [],
        latencyMs: 0,
        outcome: "RATE_LIMITED",
        error: "daily token budget exceeded",
      }),
    );
    return Response.json(
      { error: "You've reached today's assistant usage limit. It resets in 24 hours." },
      { status: 429 },
    );
  }

  const history = await listSessionMessages(sessionId);
  const priorCount = history.length;
  const uiMessages = [...history, message as UIMessage];

  const startedAt = Date.now();
  const result = streamAgentReply({
    uiMessages,
    summary: priorSummary,
    ctx: { userId, sessionId },
    onComplete: (stats) => {
      // Fires after the response has streamed; the insert is best-effort.
      void recordAgentRun({
        sessionId,
        userId,
        model: stats.model,
        inputTokens: stats.inputTokens,
        outputTokens: stats.outputTokens,
        totalTokens: stats.totalTokens,
        steps: stats.steps,
        toolNames: stats.toolNames,
        latencyMs: Date.now() - startedAt,
        outcome: stats.outcome,
        error: stats.error,
      });
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: uiMessages,
    onFinish: async ({ messages }) => {
      // Critical path: persist the transcript and bump activity now.
      try {
        await appendSessionMessages(sessionId, messages.slice(priorCount));
        await finalizeTurn(sessionId, {});
      } catch (err) {
        logger.error({ err, sessionId }, "agent transcript persistence failed");
      }

      // Non-critical: title + rolling summary each cost a model call. Run them
      // after the response has been sent so they never add to perceived latency.
      after(async () => {
        try {
          const patch: { summary?: string; title?: string } = {};

          if (shouldRefreshSummary(await countSessionMessages(sessionId))) {
            const { overflow } = windowMessages(await listSessionMessages(sessionId));
            const next = await refreshSummary(priorSummary, messagesToPlainText(overflow));
            if (next && next !== priorSummary) patch.summary = next;
          }
          if (priorCount === 0) {
            const title = await generateSessionTitle(userMessageText(message.parts));
            if (title) patch.title = title;
          }
          if (patch.summary || patch.title) await finalizeTurn(sessionId, patch);
        } catch (err) {
          logger.error({ err, sessionId }, "agent post-turn housekeeping failed");
        }
      });
    },
    onError: (err) => {
      logger.error({ err, sessionId }, "agent stream error");
      captureAgentError(err, sessionId);
      return "The assistant had trouble responding. Please try again.";
    },
  });
}
