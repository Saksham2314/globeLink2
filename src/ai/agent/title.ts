import "server-only";

import { generateText } from "ai";

import { logger } from "@/lib/logger";

import { getExtractionModel } from "../provider";

/** A short title for a new session, from its first user message. Best-effort —
 *  returns null on failure and the session keeps its default name. */
export async function generateSessionTitle(firstUserText: string): Promise<string | null> {
  const seed = firstUserText.trim().slice(0, 400);
  if (seed.length < 3) return null;

  try {
    const { text } = await generateText({
      model: getExtractionModel(),
      system:
        "Write a 3-6 word title for a travel-planning chat that opens with this message. Title Case. No quotes, no trailing punctuation, no preamble.",
      prompt: seed,
      temperature: 0.2,
    });
    const title = text
      .trim()
      .replace(/^["'\s]+|["'\s.]+$/g, "")
      .slice(0, 80);
    return title.length >= 3 ? title : null;
  } catch (err) {
    logger.warn({ err }, "session title generation failed");
    return null;
  }
}
