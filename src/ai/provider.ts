import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";

import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

/**
 * The single place a model is constructed. Nothing else in `src/ai` imports the
 * provider SDK directly, so swapping providers or models is one edit here.
 */

/** Small, fast, cheap. Constraint extraction and rolling-summary generation. */
export const EXTRACTION_MODEL_ID = "claude-haiku-4-5-20251001";

/** Runs the agent tool-calling loop. Its own constant so switching the agent to
 *  a stronger model (e.g. Sonnet) if quality demands it is a one-line change. */
export const AGENT_MODEL_ID = "claude-haiku-4-5-20251001";

let anthropic: ReturnType<typeof createAnthropic> | null = null;

function client() {
  if (!env.ANTHROPIC_API_KEY) {
    // Callers should gate on `isAiEnabled` first; this is the backstop.
    throw AppError.internal("ANTHROPIC_API_KEY is not configured");
  }
  anthropic ??= createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return anthropic;
}

export function getExtractionModel() {
  return client()(EXTRACTION_MODEL_ID);
}

export function getAgentModel() {
  return client()(AGENT_MODEL_ID);
}
