"use server";

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
