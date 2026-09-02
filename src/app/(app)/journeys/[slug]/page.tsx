import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JourneyStatRow } from "@/components/globe/journey-stat-row";
import { JourneyTimeline } from "@/components/globe/journey-timeline";
import { SaveButton } from "@/components/globe/save-button";
import { StartConversationButton } from "@/components/globe/start-conversation-button";
import { StartItineraryButton } from "@/components/globe/start-itinerary-button";
import { Markdown } from "@/components/ui/markdown";
import { auth } from "@/lib/auth";
import { getPublicJourney, recordView } from "@/modules/journeys/journey.service";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicJourney(slug);
  if (!result) return { title: "Journey not found" };
  const { journey } = result;
  return {
    title: journey.title,
    description: journey.summary ?? undefined,
    openGraph: {
      title: journey.title,
      description: journey.summary ?? undefined,
      images: journey.coverImageUrl ? [journey.coverImageUrl] : undefined,
    },
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function JourneyPage({ params }: Params) {
  const { slug } = await params;
  const session = await auth();

  const result = await getPublicJourney(slug, session?.user?.id);
  if (!result) notFound();
  const { journey, journeyId, authorId, isViewerAuthor, isSaved } = result;

  if (journey.status === "PUBLISHED" && !isViewerAuthor) {
    void recordView(slug);
  }

  return (
    <article className="pb-20">
      {journey.status !== "PUBLISHED" ? (
        <div className="border-border bg-surface-muted border-b">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-6 py-2.5 text-sm md:px-8">
            <span className="text-muted">
              This is a {journey.status.toLowerCase()} — only you can see it.
            </span>
            <Link
              href={`/journeys/${journey.slug}/edit`}
              className="text-accent font-medium hover:underline"
            >
              Edit
            </Link>
          </div>
        </div>
      ) : null}

      {journey.coverImageUrl ? (
        <div className="bg-surface-muted relative aspect-[16/9] max-h-[520px] w-full">
          <Image
            src={journey.coverImageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-6 md:px-8">
        <header className="pt-10">
          <p className="text-muted text-xs font-semibold tracking-[0.16em] uppercase">
            {[journey.destinationName, journey.country].filter(Boolean).join(", ") || "Journey"}
          </p>
          <h1 className="font-display text-ink mt-3 text-3xl leading-tight md:text-4xl">
            {journey.title}
          </h1>
          {journey.summary ? (
            <p className="text-muted mt-4 text-lg leading-relaxed">{journey.summary}</p>
          ) : null}

          <div className="mt-6 flex items-center gap-3">
            <span className="border-border-strong bg-surface-muted text-ink flex size-9 items-center justify-center overflow-hidden rounded-full border text-sm">
              {journey.author.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={journey.author.image} alt="" className="size-full object-cover" />
              ) : (
                (journey.author.name ?? "?").charAt(0).toUpperCase()
              )}
            </span>
            <div className="text-sm">
              <p className="text-ink">{journey.author.name ?? "A traveller"}</p>
              {journey.author.handle ? (
                <Link
                  href={`/profile/${journey.author.handle}`}
                  className="text-muted hover:text-ink"
                >
                  @{journey.author.handle}
                </Link>
              ) : null}
            </div>

            {!isViewerAuthor && journey.status === "PUBLISHED" ? (
              <div className="ml-auto flex items-center gap-2">
                <StartItineraryButton
                  slug={journey.slug}
                  canFork={Boolean(session?.user)}
                  returnTo={`/journeys/${journey.slug}`}
                />
                <StartConversationButton
                  authorId={authorId}
                  journeyId={journeyId}
                  canMessage={Boolean(session?.user)}
                  returnTo={`/journeys/${journey.slug}`}
                />
                <SaveButton
                  journeyId={journeyId}
                  initialSaved={isSaved}
                  canSave={Boolean(session?.user)}
                  variant="labelled"
                />
              </div>
            ) : null}
          </div>
        </header>

        <div className="mt-8">
          <JourneyStatRow journey={journey} />
        </div>

        {journey.travelStyle.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {journey.travelStyle.map((s) => (
              <span
                key={s}
                className="border-border bg-surface-muted text-muted rounded-full border px-3 py-1 text-xs"
              >
                {s === "roadtrip" ? "Road trip" : cap(s)}
              </span>
            ))}
          </div>
        ) : null}

        {journey.description ? (
          <section className="mt-12">
            <Markdown>{journey.description}</Markdown>
          </section>
        ) : null}

        {journey.days.length ? (
          <section className="mt-14">
            <h2 className="font-display text-ink text-xl">Itinerary</h2>
            <div className="mt-6">
              <JourneyTimeline days={journey.days} />
            </div>
          </section>
        ) : null}

        {journey.tips.length ? (
          <section className="mt-14">
            <h2 className="font-display text-ink text-xl">Tips</h2>
            <ul className="mt-4 space-y-2">
              {journey.tips.map((tip, i) => (
                <li key={i} className="text-ink flex gap-2.5 text-sm">
                  <span className="text-accent">→</span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {journey.images.length > 1 ? (
          <section className="mt-14">
            <h2 className="font-display text-ink text-xl">Gallery</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {journey.images.map((img) => (
                <figure key={img.id} className="border-border overflow-hidden rounded-lg border">
                  <div className="bg-surface-muted relative aspect-[4/3]">
                    <Image
                      src={img.url}
                      alt={img.caption ?? ""}
                      fill
                      sizes="50vw"
                      className="object-cover"
                    />
                  </div>
                  {img.caption ? (
                    <figcaption className="text-muted px-3 py-2 text-xs">{img.caption}</figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}
