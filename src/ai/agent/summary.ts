import "server-only";

import { generateText } from "ai";

import { logger } from "@/lib/logger";

import { getExtractionModel } from "../provider";

/**
 * Fold the turns that have scrolled out of the context window into a rolling
 * summary. Best-effort — on failure the previous summary is kept unchanged.
 */
export async function refreshSummary(
  priorSummary: string | null,
  overflowText: string,
): Promise<string | null> {
  if (!overflowText.trim()) return priorSummary;

  try {
    const { text } = await generateText({
      model: getExtractionModel(),
      system:
        "Summarize this travel-planning conversation in 3-5 sentences: what the user wants, their constraints (destination, budget, dates, style), and which journeys have been discussed. Merge with any existing summary. Plain text, no preamble.",
      prompt: [
        priorSummary ? `Existing summary:\n${priorSummary}\n` : "",
        `Conversation excerpt:\n${overflowText}`,
      ]
        .filter(Boolean)
        .join("\n"),
      temperature: 0,
    });
    return text.trim() || priorSummary;
  } catch (err) {
    logger.warn({ err }, "conversation summary refresh failed");
    return priorSummary;
  }
}
