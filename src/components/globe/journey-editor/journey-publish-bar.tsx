"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import {
  deleteJourneyAction,
  publishJourneyAction,
  unpublishJourneyAction,
} from "@/modules/journeys/journey.actions";
import type { PublishRequirement } from "@/modules/journeys/journey.schema";

interface Props {
  journeyId: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  requirements: PublishRequirement[];
}

export function JourneyPublishBar({ journeyId, slug, status, requirements }: Props) {
  const router = useRouter();
  const [state, setState] = useState<{ error?: string; message?: string }>({});
  const [pending, start] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const missing = requirements.filter((r) => !r.met);
  const canPublish = missing.length === 0;

  const act = (fn: () => Promise<{ error?: string; message?: string }>) =>
    start(async () => {
      setState({});
      const r = await fn();
      setState(r);
      if (!r.error) router.refresh();
    });

  return (
    <div className="border-border bg-surface space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-ink text-sm font-medium">
            {status === "PUBLISHED" ? "Published" : status === "ARCHIVED" ? "Archived" : "Draft"}
          </p>
          <p className="text-muted text-xs">
            {status === "PUBLISHED" ? (
              <a href={`/journeys/${slug}`} className="text-accent hover:underline">
                View public page
              </a>
            ) : (
              "Only you can see this right now."
            )}
          </p>
        </div>

        <div className="flex gap-2">
          {status === "PUBLISHED" ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => act(() => unpublishJourneyAction(journeyId))}
            >
              Unpublish
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={pending || !canPublish}
              onClick={() => act(() => publishJourneyAction(journeyId))}
            >
              {pending ? "Working…" : "Publish"}
            </Button>
          )}
        </div>
      </div>

      <FormMessage error={state.error} message={state.message} />

      {!canPublish && status !== "PUBLISHED" ? (
        <ul className="text-muted space-y-1 text-xs">
          {requirements.map((r) => (
            <li key={r.key} className={r.met ? "text-muted line-through" : "text-ink"}>
              {r.met ? "✓" : "•"} {r.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="border-border border-t pt-3">
        {confirmingDelete ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink">Delete this journey?</span>
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => act(() => deleteJourneyAction(journeyId))}
            >
              Yes, delete
            </Button>
            <button
              type="button"
              className="text-muted hover:text-ink text-xs"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="text-danger text-xs hover:underline"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete journey
          </button>
        )}
      </div>
    </div>
  );
}
