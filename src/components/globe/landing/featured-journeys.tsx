import Image from "next/image";
import Link from "next/link";

import { JourneyCard } from "@/components/globe/journey-card";
import { SaveButton } from "@/components/globe/save-button";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { formatDuration, formatMoney } from "@/lib/format";
import { TiltCard } from "./tilt-card";
import type { JourneyCardDto } from "@/modules/journeys/journey.mappers";

interface FeaturedJourneysProps {
  /** `null` = the query failed; `[]` = nothing published yet. */
  journeys: JourneyCardDto[] | null;
  viewerCanSave: boolean;
}

/**
 * The most recently published journeys, straight from the existing search
 * service — the lead one gets an editorial layout, the rest reuse JourneyCard.
 */
export function FeaturedJourneys({ journeys, viewerCanSave }: FeaturedJourneysProps) {
  if (journeys === null) {
    return (
      <Notice
        title="Journeys couldn’t load just now."
        body="Explore still works — try it there, or refresh in a moment."
        href="/explore"
        cta="Open Explore"
      />
    );
  }

  if (journeys.length === 0) {
    return (
      <Notice
        title="No journeys published yet."
        body="GlobeLink is built from trips people have actually taken. Yours could be the first."
        href="/journeys/new"
        cta="Publish a journey"
      />
    );
  }

  const [lead, ...rest] = journeys;

  return (
    <div className="space-y-10">
      <Reveal>
        <TiltCard max={3} className="rounded-xl">
          <LeadJourney journey={lead!} viewerCanSave={viewerCanSave} />
        </TiltCard>
      </Reveal>
      {rest.length ? (
        <RevealGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((j) => (
            <RevealItem key={j.id}>
              <TiltCard className="rounded-lg">
                <JourneyCard journey={j} viewerCanSave={viewerCanSave} />
              </TiltCard>
            </RevealItem>
          ))}
        </RevealGroup>
      ) : null}
    </div>
  );
}

function LeadJourney({
  journey,
  viewerCanSave,
}: {
  journey: JourneyCardDto;
  viewerCanSave: boolean;
}) {
  const place = [journey.destinationName, journey.country].filter(Boolean).join(", ");
  const facts = [
    { label: "Length", value: formatDuration(journey.durationDays) },
    { label: "Reported budget", value: formatMoney(journey.budgetAmount, journey.budgetCurrency) },
    {
      label: "Shared by",
      value: journey.author.name ?? (journey.author.handle ? `@${journey.author.handle}` : null),
    },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));

  return (
    <article className="border-border bg-surface grid overflow-hidden rounded-xl border shadow-xl lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <Link
        href={`/journeys/${journey.slug}`}
        className="bg-surface-muted group relative block aspect-[4/3] overflow-hidden lg:aspect-auto lg:min-h-[26rem]"
        tabIndex={-1}
        aria-hidden
      >
        {journey.coverImageUrl ? (
          <Image
            src={journey.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 640px, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="text-muted flex h-full items-center justify-center text-sm">
            No photo yet
          </div>
        )}
      </Link>

      <div className="flex flex-col gap-5 p-6 md:p-8">
        <div className="space-y-2">
          {place ? (
            <p className="text-gold text-xs font-semibold tracking-[0.16em] uppercase">{place}</p>
          ) : null}
          <h3 className="font-display text-ink text-3xl leading-tight md:text-4xl">
            <Link
              href={`/journeys/${journey.slug}`}
              className="hover:text-accent transition-colors"
            >
              {journey.title}
            </Link>
          </h3>
          {journey.summary ? (
            <p className="text-muted text-base leading-relaxed">{journey.summary}</p>
          ) : null}
        </div>

        {facts.length ? (
          <dl className="border-border grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-5 text-sm">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="text-muted text-xs">{f.label}</dt>
                <dd className="text-ink mt-0.5 font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
          <Button asChild>
            <Link href={`/journeys/${journey.slug}`}>View journey</Link>
          </Button>
          <SaveButton
            journeyId={journey.id}
            initialSaved={journey.isSaved}
            canSave={viewerCanSave}
            variant="labelled"
          />
        </div>
      </div>
    </article>
  );
}

function Notice({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="border-border-strong rounded-xl border border-dashed px-6 py-14 text-center">
      <p className="text-ink font-medium">{title}</p>
      <p className="text-muted mx-auto mt-1 max-w-md text-sm">{body}</p>
      <Link
        href={href}
        className="text-accent mt-4 inline-block text-sm font-medium hover:underline"
      >
        {cta}
      </Link>
    </div>
  );
}
