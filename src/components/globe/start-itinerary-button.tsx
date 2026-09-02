import Link from "next/link";

import { forkJourneyAction } from "@/modules/itineraries/itinerary.actions";

interface Props {
  slug: string;
  /** Whether the viewer is signed in. */
  canFork: boolean;
  /** Path to return to after signing in. */
  returnTo: string;
}

/** "Plan my own" on the journey page — forks the journey into a personal,
 *  editable itinerary. */
export function StartItineraryButton({ slug, canFork, returnTo }: Props) {
  const cls =
    "inline-flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-muted";

  if (!canFork) {
    return (
      <Link href={`/login?next=${encodeURIComponent(returnTo)}`} className={cls}>
        Plan my own
      </Link>
    );
  }

  return (
    <form action={forkJourneyAction}>
      <input type="hidden" name="slug" value={slug} />
      <button type="submit" className={cls}>
        Plan my own
      </button>
    </form>
  );
}
