"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteItineraryAction } from "@/modules/itineraries/itinerary.actions";

export function ItineraryDeleteButton({ itineraryId }: { itineraryId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" className="text-danger" onClick={() => setConfirming(true)}>
        Delete itinerary
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted text-sm">Delete this itinerary permanently?</span>
      <Button
        size="sm"
        className="bg-danger text-accent-contrast hover:bg-danger"
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          start(async () => {
            const res = await deleteItineraryAction(itineraryId);
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      {error ? <span className="text-danger text-sm">{error}</span> : null}
    </div>
  );
}
