"use client";

import Image from "next/image";
import Link from "next/link";
import { forwardRef } from "react";

import { SaveButton } from "@/components/globe/save-button";
import { formatDuration, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AtlasDestination, AtlasJourney } from "@/modules/atlas/atlas.types";

interface DestinationPreviewProps {
  destination: AtlasDestination;
  viewerCanSave: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * Everything published about the selected place: a card for every journey
 * that went there (newest first), each linking to its journey page with a
 * working save toggle, plus a way into Explore filtered to the place. Real
 * interface outside the WebGL canvas; only fields journeys actually have.
 */
export const DestinationPreview = forwardRef<HTMLHeadingElement, DestinationPreviewProps>(
  function DestinationPreview({ destination, viewerCanSave, onClose, className }, headingRef) {
    const count = destination.journeys.length;

    return (
      <section
        id="atlas-preview"
        aria-labelledby="atlas-preview-title"
        className={cn(
          "border-border bg-surface/95 text-ink flex flex-col shadow-2xl backdrop-blur-md",
          "gl-rise [--gl-delay:0s] [animation-duration:0.35s]",
          className,
        )}
      >
        <header className="border-border flex items-start justify-between gap-3 border-b px-5 pt-4 pb-3">
          <div className="min-w-0">
            <p className="text-gold text-[11px] font-semibold tracking-[0.16em] uppercase">
              {count} published {count === 1 ? "journey" : "journeys"}
            </p>
            <h2
              ref={headingRef}
              id="atlas-preview-title"
              tabIndex={-1}
              className="font-display text-ink mt-1 text-2xl leading-tight outline-none"
            >
              {destination.name}
            </h2>
            {destination.country && destination.country !== destination.name ? (
              <p className="text-muted text-sm">{destination.country}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${destination.name} journeys`}
            className="text-muted hover:text-ink hover:bg-surface-muted -mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <ul
          aria-label={`Journeys to ${destination.name}`}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4"
        >
          {destination.journeys.map((j) => (
            <li key={j.id}>
              <JourneyMiniCard journey={j} viewerCanSave={viewerCanSave} />
            </li>
          ))}
        </ul>

        <footer className="border-border space-y-2 border-t px-5 pt-3 pb-4">
          {destination.precision === "country" ? (
            <p className="text-muted text-xs">
              Shown at country level — these journeys don&rsquo;t record a more exact place.
            </p>
          ) : null}
          <Link
            href={destination.exploreHref}
            className="bg-accent text-accent-contrast hover:bg-accent-hover inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-medium transition-colors"
          >
            Explore journeys in {destination.name}
          </Link>
        </footer>
      </section>
    );
  },
);

function JourneyMiniCard({
  journey: j,
  viewerCanSave,
}: {
  journey: AtlasJourney;
  viewerCanSave: boolean;
}) {
  const meta = [
    formatDuration(j.durationDays),
    j.budgetAmount != null ? `${formatMoney(j.budgetAmount, j.budgetCurrency)} reported` : null,
  ].filter(Boolean);
  const days = j.days.filter((d) => d.title?.trim()).slice(0, 3);

  return (
    <article className="group border-border bg-bg/60 hover:border-border-strong relative overflow-hidden rounded-lg border transition-colors">
      <SaveButton
        journeyId={j.id}
        initialSaved={j.isSaved}
        canSave={viewerCanSave}
        className="absolute top-2.5 right-2.5 z-10 size-8"
      />
      <Link href={`/journeys/${j.slug}`} className="block">
        {/* No photo → no empty image box; the card just stays compact. */}
        {j.coverImageUrl ? (
          <div className="bg-surface-muted relative aspect-[16/9] overflow-hidden">
            <Image
              src={j.coverImageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 22rem, 100vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          </div>
        ) : null}
        <div className={cn("space-y-1 p-3.5", !j.coverImageUrl && "pr-12")}>
          <h3 className="font-display text-ink group-hover:text-accent text-lg leading-snug transition-colors">
            {j.title}
          </h3>
          {meta.length ? <p className="text-muted text-xs">{meta.join(" · ")}</p> : null}
          {j.summary ? <p className="text-muted line-clamp-2 pt-0.5 text-sm">{j.summary}</p> : null}
          {days.length ? (
            <ol className="border-gold-line/50 mt-2 space-y-1 border-l pl-3">
              {days.map((d) => (
                <li key={d.dayNumber} className="text-ink/90 text-xs">
                  <span className="text-muted mr-1.5">Day {d.dayNumber}</span>
                  {d.title}
                </li>
              ))}
            </ol>
          ) : null}
          {j.authorName ? <p className="text-muted pt-1 text-xs">by {j.authorName}</p> : null}
        </div>
      </Link>
    </article>
  );
}
