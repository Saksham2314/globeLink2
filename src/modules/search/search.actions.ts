"use server";

import { hasAnyConstraint } from "@/ai/extraction/constraints.schema";
import { extractTravelConstraints } from "@/ai/extraction/extract-constraints";
import { looksLikeNaturalLanguageQuery } from "@/ai/extraction/heuristic";
import {
  describeRelaxed,
  relaxationLadder,
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
  /** Understood filters left out because, together, they matched nothing. */
  relaxed: string | null;
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
  if (!raw) return { params: {}, interpreted: false, note: null, relaxed: null };

  const textSearch: InterpretResult = {
    params: { q: raw },
    interpreted: false,
    note: null,
    relaxed: null,
  };

  if (!looksLikeNaturalLanguageQuery(raw)) return textSearch;

  const outcome = await extractTravelConstraints(raw);
  if (!outcome || !hasAnyConstraint(outcome.constraints)) return withAnyWordFallback(textSearch);

  const params = travelConstraintsToSearchParams(outcome.constraints);
  if (Object.keys(params).length === 0) return withAnyWordFallback(textSearch);

  const note = summarizeConstraints(outcome.constraints) || null;
  const relaxedStep = await firstMatchingRelaxation(params);
  if (!relaxedStep) return { params, interpreted: true, note, relaxed: null };

  return {
    params: relaxedStep.params,
    interpreted: true,
    note,
    relaxed:
      relaxedStep.dropped.map((k) => describeRelaxed(k, outcome.constraints)).join(" · ") || null,
  };
}

const hasResults = async (p: Record<string, string>) =>
  (await searchJourneys(searchParamsSchema.parse({ ...p, limit: "1" }))).items.length > 0;

/**
 * A whole sentence sent as plain text search must match every word, which
 * almost never happens (e.g. when the model is unavailable). If it matches
 * nothing, match any of its words instead — still ranked by best match.
 */
async function withAnyWordFallback(result: InterpretResult): Promise<InterpretResult> {
  try {
    if (await hasResults(result.params)) return result;
    const any = { ...result.params, match: "any" };
    if (await hasResults(any)) return { ...result, params: any };
  } catch (error) {
    logger.warn({ err: error }, "any-word search fallback failed; keeping exact text search");
  }
  return result;
}

/**
 * When every understood filter together matches nothing, find the least
 * loosening (styles, then length, then budget) that returns something. Null
 * when the exact interpretation already matches, or nothing helps — then the
 * user sees the honest empty state.
 */
async function firstMatchingRelaxation(params: Record<string, string>) {
  try {
    if (await hasResults(params)) return null;
    // A region sent as text ("East Africa") may only partly match.
    if (params.q?.includes(" ") && (await hasResults({ ...params, match: "any" }))) {
      return { params: { ...params, match: "any" }, dropped: [] };
    }
    for (const step of relaxationLadder(params)) {
      if (await hasResults(step.params)) return step;
    }
  } catch (error) {
    logger.warn({ err: error }, "search relaxation failed; keeping exact interpretation");
  }
  return null;
}
