import "server-only";

import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";

import { logger } from "@/lib/logger";

import { getAgentModel } from "../provider";
import type { ToolContext } from "../tools/context";
import { windowMessages } from "./context-window";
import { buildSystemPrompt } from "./system-prompt";
import { buildAgentTools } from "./to-ai-sdk-tool";

/** Hard cap on model↔tool round-trips per turn. */
export const MAX_STEPS = 6;
/** Below the ~60s Vercel function ceiling, with headroom for persistence. */
export const TURN_TIMEOUT_MS = 55_000;

/**
 * Run one assistant turn: assemble context (system + rolling summary + windowed
 * history + the new user message), stream the reply, let the model call the
 * read tools up to `MAX_STEPS` times. Returns the `streamText` result so the
 * route can pipe it to the client and persist the transcript in `onFinish`.
 */
export function streamAgentReply(params: {
  uiMessages: UIMessage[];
  summary: string | null;
  ctx: ToolContext;
}) {
  const tools = buildAgentTools(params.ctx);
  const { window } = windowMessages(params.uiMessages);

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
  });
}
