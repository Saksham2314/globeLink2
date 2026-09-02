import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ExploreFilters } from "@/components/globe/explore-filters";
import { ExploreNlSearch } from "@/components/globe/explore-nl-search";
import { PaginatedJourneyGrid } from "@/components/globe/paginated-journey-grid";
import { Container } from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { isAiEnabled } from "@/lib/env";
import { loadMoreSearchAction } from "@/modules/search/search.actions";
import { hasActiveFilters, searchParamsSchema } from "@/modules/search/search.schema";
import { searchJourneys } from "@/modules/search/search.service";

export const metadata: Metadata = {
  title: "Explore journeys",
  description: "Search real journeys by destination, budget, length and style.",
};

type RawParams = Record<string, string | string[] | undefined>;

function flatten(raw: RawParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const first = Array.isArray(v) ? v[0] : v;
    if (typeof first === "string" && first.length) out[k] = first;
  }
  return out;
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = await searchParams;
  const flat = flatten(raw);
  const params = searchParamsSchema.parse(flat);

  const session = await auth();
  const result = await searchJourneys(params, session?.user?.id);

  // Filters (not the cursor) that "Load more" should carry forward.
  const filterParams = { ...flat };
  delete filterParams.cursor;

  return (
    <Container className="py-12">
      <header className="mb-8">
        <h1 className="font-display text-ink text-3xl">Explore journeys</h1>
        <p className="text-muted mt-1 text-sm">Real trips, from the people who took them.</p>
      </header>

      <div className="mb-4">
        <ExploreNlSearch enabled={isAiEnabled} />
      </div>

      <Suspense fallback={<div className="border-border h-40 rounded-lg border" />}>
        <ExploreFilters />
      </Suspense>

      <div className="mt-8">
        <PaginatedJourneyGrid
          key={JSON.stringify(flat)}
          initialItems={result.items}
          initialCursor={result.nextCursor}
          viewerCanSave={Boolean(session?.user)}
          loadMore={loadMoreSearchAction.bind(null, filterParams)}
          emptyState={
            <div className="border-border rounded-lg border border-dashed py-16 text-center">
              <p className="text-ink text-sm font-medium">No journeys match.</p>
              <p className="text-muted mt-1 text-sm">
                {hasActiveFilters(params)
                  ? "Try widening the budget or removing a filter."
                  : "Be the first — publish a journey you've taken."}
              </p>
              <Link
                href="/journeys/new"
                className="text-accent mt-4 inline-block text-sm font-medium hover:underline"
              >
                Publish a journey
              </Link>
            </div>
          }
        />
      </div>
    </Container>
  );
}
