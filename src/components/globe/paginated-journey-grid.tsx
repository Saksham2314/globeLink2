"use client";

import { useState, useTransition, type ReactNode } from "react";

import { JourneyCard } from "@/components/globe/journey-card";
import { Button } from "@/components/ui/button";
import type { JourneyCardDto } from "@/modules/journeys/journey.mappers";

interface Props {
  initialItems: JourneyCardDto[];
  initialCursor: string | null;
  viewerCanSave: boolean;
  /** Server action bound to any context it needs; takes just the cursor. */
  loadMore: (cursor: string) => Promise<{ items: JourneyCardDto[]; nextCursor: string | null }>;
  emptyState: ReactNode;
}

/**
 * A journey grid with keyset "Load more" paging. Remount it (via `key`) to
 * reset the accumulated list when the query changes.
 */
export function PaginatedJourneyGrid({
  initialItems,
  initialCursor,
  viewerCanSave,
  loadMore,
  emptyState,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, start] = useTransition();

  if (items.length === 0) return <>{emptyState}</>;

  const onMore = () => {
    if (!cursor) return;
    start(async () => {
      const res = await loadMore(cursor);
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    });
  };

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((j) => (
          <JourneyCard key={j.id} journey={j} viewerCanSave={viewerCanSave} />
        ))}
      </div>

      {cursor ? (
        <div className="mt-10 flex justify-center">
          <Button variant="secondary" onClick={onMore} disabled={pending}>
            {pending ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
