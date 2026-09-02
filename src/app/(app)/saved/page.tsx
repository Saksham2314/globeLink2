import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PaginatedJourneyGrid } from "@/components/globe/paginated-journey-grid";
import { Container } from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { requireVerifiedUser } from "@/lib/require-verified";
import { loadMoreSavedAction } from "@/modules/saved/saved.actions";
import { listSaved } from "@/modules/saved/saved.service";

export const metadata: Metadata = { title: "Saved journeys" };

export default async function SavedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/saved");
  await requireVerifiedUser("/saved");

  const result = await listSaved(session.user.id);

  return (
    <Container className="py-12">
      <header className="mb-8">
        <h1 className="font-display text-ink text-3xl">Saved</h1>
        <p className="text-muted mt-1 text-sm">Journeys you&rsquo;ve bookmarked.</p>
      </header>

      <PaginatedJourneyGrid
        initialItems={result.items}
        initialCursor={result.nextCursor}
        viewerCanSave
        loadMore={loadMoreSavedAction}
        emptyState={
          <div className="border-border rounded-lg border border-dashed py-16 text-center">
            <p className="text-ink text-sm font-medium">Nothing saved yet.</p>
            <p className="text-muted mt-1 text-sm">Tap the heart on any journey to keep it here.</p>
            <Link
              href="/explore"
              className="text-accent mt-4 inline-block text-sm font-medium hover:underline"
            >
              Explore journeys
            </Link>
          </div>
        }
      />
    </Container>
  );
}
