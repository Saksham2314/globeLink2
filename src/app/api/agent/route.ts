import type { UIMessage } from "ai";

import { refreshSummary } from "@/ai/agent/summary";
import {
  messagesToPlainText,
  shouldRefreshSummary,
  windowMessages,
} from "@/ai/agent/context-window";
import { streamAgentReply } from "@/ai/agent/orchestrator";
import { generateSessionTitle } from "@/ai/agent/title";
import { auth } from "@/lib/auth";
import { isAiEnabled } from "@/lib/env";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  appendSessionMessages,
  countSessionMessages,
  listSessionMessages,
} from "@/modules/agent/agent-message.service";
import { finalizeTurn, getOwnedSession } from "@/modules/agent/agent-session.service";
import { agentRequestSchema, userMessageText } from "@/modules/agent/agent.schema";

export const runtime = "nodejs";
export const maxDuration = 60;

// Per-user request rate limit. In-memory: resets on cold start, which is an
// acceptable ceiling for a soft limit. The tokens/day budget is Phase 9.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 12;
const recentHits = new Map<string, number[]>();

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

  const history = await listSessionMessages(sessionId);
  const priorCount = history.length;
  const uiMessages = [...history, message as UIMessage];

  const result = streamAgentReply({
    uiMessages,
    summary: priorSummary,
    ctx: { userId, sessionId },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: uiMessages,
    onFinish: async ({ messages }) => {
      try {
        await appendSessionMessages(sessionId, messages.slice(priorCount));

        const patch: { summary?: string; title?: string } = {};

        const total = await countSessionMessages(sessionId);
        if (shouldRefreshSummary(total)) {
          const { overflow } = windowMessages(await listSessionMessages(sessionId));
          const next = await refreshSummary(priorSummary, messagesToPlainText(overflow));
          if (next && next !== priorSummary) patch.summary = next;
        }

        if (priorCount === 0) {
          const title = await generateSessionTitle(userMessageText(message.parts));
          if (title) patch.title = title;
        }

        await finalizeTurn(sessionId, patch);
      } catch (err) {
        logger.error({ err, sessionId }, "agent onFinish persistence failed");
      }
    },
    onError: (err) => {
      logger.error({ err, sessionId }, "agent stream error");
      return "The assistant had trouble responding. Please try again.";
    },
  });
}
