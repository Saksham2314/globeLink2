import Link from "next/link";

import { formatDateRange, formatDuration, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ItineraryCardDto } from "@/modules/itineraries/itinerary.mappers";

const STATUS_STYLES: Record<ItineraryCardDto["status"], string> = {
  DRAFT: "border-border bg-surface-muted text-muted",
  ACTIVE: "border-accent/40 bg-accent-soft text-accent",
  COMPLETED: "border-success/40 bg-success/10 text-success",
};

export function ItineraryCard({ itinerary }: { itinerary: ItineraryCardDto }) {
  const dates = formatDateRange(itinerary.startDate, itinerary.endDate);
  const duration = formatDuration(itinerary.dayCount);
  const total = formatMoney(itinerary.totalCost, itinerary.currency);
  const place =
    [itinerary.destinationName, itinerary.country].filter(Boolean).join(", ") ||
    "No destination yet";

  return (
    <Link
      href={`/itineraries/${itinerary.id}`}
      className="border-border bg-surface hover:border-border-strong focus-visible:ring-accent focus-visible:ring-offset-bg block rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted text-xs font-semibold tracking-[0.14em] uppercase">{place}</p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            STATUS_STYLES[itinerary.status],
          )}
        >
          {itinerary.status[0] + itinerary.status.slice(1).toLowerCase()}
        </span>
      </div>

      <h3 className="font-display text-ink mt-2 text-lg leading-snug">{itinerary.title}</h3>

      <div className="text-muted mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {dates ? <span>{dates}</span> : null}
        {duration ? <span>{duration}</span> : null}
        {total ? <span className="text-ink font-medium">{total}</span> : null}
      </div>

      {itinerary.sourceJourney ? (
        <p className="text-muted mt-2 text-xs">
          Forked from &ldquo;{itinerary.sourceJourney.title}&rdquo;
        </p>
      ) : null}
    </Link>
  );
}
