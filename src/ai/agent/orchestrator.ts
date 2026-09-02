import "server-only";

import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";

import { logger } from "@/lib/logger";

import { AGENT_MODEL_ID, getAgentModel } from "../provider";
import type { ToolContext } from "../tools/context";
import { windowMessages } from "./context-window";
import { buildSystemPrompt } from "./system-prompt";
import { buildAgentTools } from "./to-ai-sdk-tool";

/** Hard cap on model↔tool round-trips per turn. */
export const MAX_STEPS = 6;
/** Below the ~60s Vercel function ceiling, with headroom for persistence. */
export const TURN_TIMEOUT_MS = 55_000;

/** One-turn telemetry handed to the route so it can write an `AgentRun` row
 *  without `src/ai` importing `@/modules` (the eslint boundary forbids it). */
export interface RunStats {
  outcome: "OK" | "ERROR" | "TIMEOUT";
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  steps: number;
  toolNames: string[];
  error: string | null;
}

function isAbortError(err: unknown): boolean {
  const name = (err as { name?: string } | null)?.name;
  return name === "AbortError" || name === "TimeoutError";
}

/**
 * Run one assistant turn: assemble context (system + rolling summary + windowed
 * history + the new user message), stream the reply, let the model call the
 * read tools up to `MAX_STEPS` times. Returns the `streamText` result so the
 * route can pipe it to the client and persist the transcript in `onFinish`.
 *
 * `onComplete` fires exactly once per turn (on finish or on error) with the
 * per-run stats for observability.
 */
export function streamAgentReply(params: {
  uiMessages: UIMessage[];
  summary: string | null;
  ctx: ToolContext;
  onComplete?: (stats: RunStats) => void;
}) {
  const tools = buildAgentTools(params.ctx);
  const { window } = windowMessages(params.uiMessages);
  let settled = false;

  const complete = (stats: RunStats) => {
    if (settled) return;
    settled = true;
    try {
      params.onComplete?.(stats);
    } catch (err) {
      logger.error({ err, sessionId: params.ctx.sessionId }, "onComplete threw");
    }
  };

  return streamText({
    model: getAgentModel(),
    system: buildSystemPrompt({ summary: params.summary }),
    messages: convertToModelMessages(window, { tools, ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: stepCountIs(MAX_STEPS),
    abortSignal: AbortSignal.timeout(TURN_TIMEOUT_MS),
    onStepFinish({ toolCalls, usage, finishReason }) {
      logger.info(
        {
          ai: "agent-step",
          sessionId: params.ctx.sessionId,
          tools: toolCalls?.map((c) => c.toolName),
          finishReason,
          inputTokens: usage?.inputTokens,
          outputTokens: usage?.outputTokens,
        },
        "agent step",
      );
    },
    onFinish({ usage, totalUsage, steps }) {
      const u = totalUsage ?? usage;
      const toolNames = steps.flatMap((s) => s.toolCalls?.map((c) => c.toolName) ?? []);
      complete({
        outcome: "OK",
        model: AGENT_MODEL_ID,
        inputTokens: u?.inputTokens ?? 0,
        outputTokens: u?.outputTokens ?? 0,
        totalTokens: u?.totalTokens ?? (u?.inputTokens ?? 0) + (u?.outputTokens ?? 0),
        steps: steps.length,
        toolNames,
        error: null,
      });
    },
    onError({ error }) {
      logger.error({ err: error, sessionId: params.ctx.sessionId }, "agent stream error");
      complete({
        outcome: isAbortError(error) ? "TIMEOUT" : "ERROR",
        model: AGENT_MODEL_ID,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        steps: 0,
        toolNames: [],
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });
}
