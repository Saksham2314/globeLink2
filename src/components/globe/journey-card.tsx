import Image from "next/image";
import Link from "next/link";

import { formatDuration, formatMoney } from "@/lib/format";
import type { JourneyCardDto } from "@/modules/journeys/journey.mappers";

export function JourneyCard({ journey }: { journey: JourneyCardDto }) {
  const meta = [
    [journey.destinationName, journey.country].filter(Boolean).join(", ") || null,
    formatDuration(journey.durationDays),
    formatMoney(journey.budgetAmount, journey.budgetCurrency),
  ].filter(Boolean);

  return (
    <Link
      href={`/journeys/${journey.slug}`}
      className="group border-border bg-surface block overflow-hidden rounded-lg border shadow-sm transition-shadow duration-200 hover:shadow-md"
    >
      <div className="bg-surface-muted relative aspect-[4/3]">
        {journey.coverImageUrl ? (
          <Image
            src={journey.coverImageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="text-muted flex h-full items-center justify-center text-xs">
            No photo yet
          </div>
        )}
        {journey.status !== "PUBLISHED" ? (
          <span className="bg-bg/90 text-muted absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-medium">
            {journey.status === "DRAFT" ? "Draft" : "Archived"}
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5 p-5">
        <h3 className="font-display text-ink text-lg leading-snug">{journey.title}</h3>
        {meta.length > 0 ? <p className="text-muted text-sm">{meta.join(" · ")}</p> : null}
        {journey.summary ? (
          <p className="text-muted line-clamp-2 pt-1 text-sm">{journey.summary}</p>
        ) : null}
      </div>
    </Link>
  );
}
