"use server";

import { hasAnyConstraint } from "@/ai/extraction/constraints.schema";
import { extractTravelConstraints } from "@/ai/extraction/extract-constraints";
import { looksLikeNaturalLanguageQuery } from "@/ai/extraction/heuristic";
import {
  summarizeConstraints,
  travelConstraintsToSearchParams,
} from "@/ai/extraction/to-search-params";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

import { searchParamsSchema } from "./search.schema";
import { searchJourneys, type SearchResult } from "./search.service";

/**
 * Fetch the next page for `/explore`. The client passes the current filter
 * params (as a plain record) plus the cursor from the previous page.
 */
export async function loadMoreSearchAction(
  rawParams: Record<string, string>,
  cursor: string,
): Promise<SearchResult> {
  try {
    const session = await auth();
    const params = searchParamsSchema.parse({ ...rawParams, cursor });
    return await searchJourneys(params, session?.user?.id);
  } catch (error) {
    logger.error({ err: error }, "loadMoreSearchAction failed");
    return { items: [], nextCursor: null };
  }
}

export interface InterpretResult {
  /** URL query params to apply to `/explore` (strings, ready for the schema). */
  params: Record<string, string>;
  /** Whether the model produced usable structured constraints. */
  interpreted: boolean;
  /** One-line summary of what was understood, when `interpreted`. */
  note: string | null;
}

/**
 * Turn a plain-language search phrase into filter params. Runs the extraction
 * model only when the text looks like a sentence; otherwise (and on any
 * failure, or with AI disabled) it falls back to a normal text search.
 *
 * This is the composition layer — the deterministic `search.service` never
 * imports AI. Extraction only fills the visible, user-editable filter form.
 */
export async function interpretSearchAction(text: string): Promise<InterpretResult> {
  const raw = text.trim().slice(0, 200);
  if (!raw) return { params: {}, interpreted: false, note: null };

  const textSearch: InterpretResult = { params: { q: raw }, interpreted: false, note: null };

  if (!looksLikeNaturalLanguageQuery(raw)) return textSearch;

  const outcome = await extractTravelConstraints(raw);
  if (!outcome || !hasAnyConstraint(outcome.constraints)) return textSearch;

  const params = travelConstraintsToSearchParams(outcome.constraints);
  if (Object.keys(params).length === 0) return textSearch;

  return { params, interpreted: true, note: summarizeConstraints(outcome.constraints) || null };
}
