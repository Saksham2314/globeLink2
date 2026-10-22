import Image from "next/image";
import Link from "next/link";

import { AtlasExperience } from "@/components/globe/atlas/atlas-experience";
import { DriftingLeaves } from "@/components/globe/landing/drifting-leaves";
import { FeaturedJourneys } from "@/components/globe/landing/featured-journeys";
import { JOURNEY_STEPS } from "@/components/globe/landing/journey-steps";
import { JourneyTree } from "@/components/globe/landing/journey-tree";
import { ParallaxBackdrop } from "@/components/globe/landing/parallax-backdrop";
import { TiltCard } from "@/components/globe/landing/tilt-card";
import { SiteFooter } from "@/components/globe/site-footer";
import { SiteHeader } from "@/components/globe/site-header";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getAtlasData } from "@/modules/atlas/atlas.service";
import type { AtlasData } from "@/modules/atlas/atlas.types";
import type { JourneyCardDto } from "@/modules/journeys/journey.mappers";
import { searchParamsSchema } from "@/modules/search/search.schema";
import { searchJourneys } from "@/modules/search/search.service";

const LANDING_NAV = [
  { label: "The idea", href: "#the-idea" },
  { label: "Journeys", href: "#journeys" },
  { label: "How it works", href: "#how-it-works" },
  { label: "The assistant", href: "#assistant" },
];

const STEPS = [
  {
    n: "01",
    title: "Discover a journey that happened",
    body: "The real route, the real budget, the day-by-day notes — and the parts that went sideways.",
    image: "/landing/featured-2.jpg",
    alt: "Chureito Pagoda and Mount Fuji at dusk, framed by cherry blossom",
  },
  {
    n: "02",
    title: "Save the ones that speak to you",
    body: "Keep the trips you want to learn from in one place, written by the people who took them.",
    image: "/landing/featured-3.jpg",
    alt: "Turquoise water and a white-sand beach below rocky cliffs",
  },
  {
    n: "03",
    title: "Fork it into your own itinerary",
    body: "Start from their days, then reshape them — change the dates, cost it out, make it yours.",
    image: "/landing/featured-1.jpg",
    alt: "A timber guesthouse on a forested mountainside at dusk",
  },
];

const EMPTY_ATLAS: AtlasData = { destinations: [], arcs: [] };

export default async function HomePage() {
  const session = await auth();
  const viewerId = session?.user?.id;
  const viewerCanSave = Boolean(viewerId);

  // Both reads are best-effort: a failure degrades its own section, never the page.
  const [atlas, featured] = await Promise.all([
    getAtlasData(viewerId).catch((err: unknown): AtlasData => {
      logger.error({ err }, "landing: atlas data failed");
      return EMPTY_ATLAS;
    }),
    searchJourneys(searchParamsSchema.parse({ sort: "recent", limit: "4" }), viewerId)
      .then((r): JourneyCardDto[] => r.items)
      .catch((err: unknown) => {
        logger.error({ err }, "landing: featured journeys failed");
        return null;
      }),
  ]);

  const closingImage = featured?.find((j) => j.coverImageUrl)?.coverImageUrl ?? null;

  return (
    <div className="gl-landing bg-bg text-ink">
      <SiteHeader nav={LANDING_NAV} />

      <main id="main-content">
        {/* ----------------------------------------------------------- Hero */}
        <section className="gl-hero relative isolate overflow-hidden">
          <DriftingLeaves />
          <Container className="relative z-10 grid max-w-[88rem] items-center gap-8 pt-12 pb-16 md:pt-16 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)] lg:gap-4 lg:py-8">
            <div className="flex flex-col items-start gap-6 md:gap-7 lg:pl-4">
              <p className="gl-rise text-gold text-xs font-semibold tracking-[0.22em] uppercase [--gl-delay:0.05s]">
                Travel, lived
              </p>
              <h1 className="gl-rise text-ink text-[2.65rem] leading-[1.02] [--gl-delay:0.12s] sm:text-6xl lg:text-[4.25rem]">
                The world is better when it&rsquo;s been lived.
              </h1>
              <p className="gl-rise text-muted max-w-lg text-lg leading-relaxed [--gl-delay:0.22s]">
                Discover real journeys. Learn from the people who took them. Make the next adventure
                yours.
              </p>

              <form
                action="/explore"
                aria-label="Search journeys"
                className="gl-rise border-border-strong bg-surface/80 focus-within:border-accent focus-within:ring-accent/25 flex w-full max-w-lg items-center gap-2 rounded-xl border p-2 shadow-lg backdrop-blur-md transition-[border-color,box-shadow] [--gl-delay:0.3s] focus-within:ring-4"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 20 20"
                  className="text-muted ml-2 size-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <circle cx="9" cy="9" r="6" />
                  <path d="m18 18-4.5-4.5" strokeLinecap="round" />
                </svg>
                <label htmlFor="hero-search" className="sr-only">
                  Search journeys
                </label>
                <input
                  id="hero-search"
                  type="search"
                  name="q"
                  placeholder="Search a place — try “Manali” or “Kyoto”"
                  className="text-ink placeholder:text-muted h-10 min-w-0 flex-1 bg-transparent px-1 text-sm focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-accent text-accent-contrast hover:bg-accent-hover focus-visible:ring-accent rounded-lg px-4 py-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Search
                </button>
              </form>

              <div className="gl-rise flex flex-wrap items-center gap-3 [--gl-delay:0.38s]">
                <Button
                  asChild
                  size="lg"
                  className="shadow-lg transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:shadow-xl motion-reduce:hover:translate-y-0"
                >
                  <Link href="/explore">Explore journeys</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="bg-surface/70 backdrop-blur transition-[background-color,transform] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
                >
                  <Link href="/assistant">Plan with AI</Link>
                </Button>
              </div>

              <a
                href="#the-idea"
                className="gl-rise text-muted hover:text-ink mt-2 hidden items-center gap-2 text-xs font-medium tracking-[0.14em] uppercase transition-colors [--gl-delay:0.5s] lg:inline-flex"
              >
                <span className="gl-cue inline-block" aria-hidden>
                  ↓
                </span>
                Scroll — every journey starts somewhere
              </a>
            </div>

            <AtlasExperience
              destinations={atlas.destinations}
              arcs={atlas.arcs}
              viewerCanSave={viewerCanSave}
            />
          </Container>
        </section>

        {/* ------------------------------------------------- The idea (tree) */}
        <section id="the-idea" className="relative scroll-mt-20 overflow-hidden">
          <Container className="pt-16 pb-6 md:pt-24">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-gold text-xs font-semibold tracking-[0.2em] uppercase">The idea</p>
              <h2 className="text-ink mt-3 text-3xl md:text-5xl">
                Every journey starts by letting go.
              </h2>
              <p className="text-muted mx-auto mt-4 max-w-xl text-base leading-relaxed md:text-lg">
                A leaf leaves the tree it grew on and travels somewhere new. So do we — and the
                stories we bring back help the next traveller find their way.
              </p>
            </Reveal>
          </Container>
          <div className="px-4 md:px-8">
            <JourneyTree />
          </div>
          <Container className="pb-12 md:hidden">
            <ol className="text-ink space-y-2 text-sm">
              {JOURNEY_STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-3">
                  <span className="text-gold font-display">{`0${i + 1}`}</span>
                  {s}
                </li>
              ))}
            </ol>
          </Container>
        </section>

        {/* ------------------------------------------------ Featured journeys */}
        <section id="journeys" className="relative scroll-mt-20">
          <Container className="pt-10 pb-20 md:pt-16 md:pb-28">
            <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-xl">
                <p className="text-gold text-xs font-semibold tracking-[0.2em] uppercase">
                  Featured journeys
                </p>
                <h2 className="text-ink mt-2 text-3xl md:text-4xl">Trips, as they were lived.</h2>
              </div>
              <Link href="/explore" className="text-accent text-sm font-medium hover:underline">
                Browse every journey
              </Link>
            </Reveal>
            <FeaturedJourneys journeys={featured} viewerCanSave={viewerCanSave} />
          </Container>
        </section>

        {/* ------------------------------------------ Journey → itinerary */}
        <section
          id="how-it-works"
          className="border-border bg-surface relative scroll-mt-20 overflow-hidden border-y"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,var(--gl-space-glow),transparent_70%)]"
          />
          <Container className="relative py-20 md:py-28">
            <Reveal className="max-w-2xl">
              <p className="text-gold text-xs font-semibold tracking-[0.2em] uppercase">
                From journey to itinerary
              </p>
              <h2 className="text-ink mt-2 text-3xl md:text-4xl">
                Someone has already been there. Start from what they learned.
              </h2>
            </Reveal>

            <RevealGroup className="relative mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
              <div
                aria-hidden
                className="border-gold-line/50 absolute top-[6rem] right-[16%] left-[16%] hidden border-t border-dashed md:block"
              />
              {STEPS.map((step) => (
                <RevealItem key={step.n} className="relative">
                  <TiltCard
                    max={12}
                    className="mx-auto w-44 rounded-full shadow-xl md:w-40 lg:w-48"
                  >
                    <div className="bg-surface-muted ring-border relative aspect-[4/5] overflow-hidden rounded-full ring-1">
                      <Image
                        src={step.image}
                        alt={step.alt}
                        fill
                        sizes="192px"
                        className="scale-105 object-cover"
                      />
                    </div>
                  </TiltCard>
                  <div className="mt-6 text-center md:px-2">
                    <p className="font-display text-gold text-xl">{step.n}</p>
                    <h3 className="text-ink mt-1 text-xl">{step.title}</h3>
                    <p className="text-muted mx-auto mt-2 max-w-xs text-sm leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </Container>
        </section>

        {/* ------------------------------------------------------ Assistant */}
        <section id="assistant" className="scroll-mt-20">
          <Container className="grid items-center gap-12 py-20 md:py-28 lg:grid-cols-2">
            <RevealGroup className="flex max-w-xl flex-col items-start gap-5">
              <RevealItem className="text-gold text-xs font-semibold tracking-[0.2em] uppercase">
                The assistant
              </RevealItem>
              <RevealItem>
                <h2 className="text-ink text-3xl md:text-4xl">Ask in plain language.</h2>
              </RevealItem>
              <RevealItem className="text-muted text-base leading-relaxed">
                The GlobeLink assistant works through the same validated tools you do — it searches
                journeys, opens them, and drafts itineraries, and it can save a journey or message
                an author. It never touches the database directly, and every change waits for your
                confirmation before it runs.
              </RevealItem>
              <RevealItem>
                <Button asChild size="lg" className="shadow-lg">
                  <Link href="/assistant">Plan with AI</Link>
                </Button>
              </RevealItem>
            </RevealGroup>

            <Reveal>
              <TiltCard max={6} className="rounded-2xl">
                <figure className="border-border bg-surface rounded-2xl border p-5 shadow-xl md:p-6">
                  <div aria-hidden className="space-y-4 text-sm">
                    <div className="bg-accent text-accent-contrast ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5">
                      Find me a relaxed week in the mountains, under ₹40,000.
                    </div>
                    <div className="bg-surface-muted text-ink w-fit max-w-[90%] rounded-2xl rounded-bl-md px-4 py-2.5 leading-relaxed">
                      I&rsquo;ll search journeys travellers have actually published that match —
                      then, if one fits, I can draft an itinerary from it for you to review.
                    </div>
                    <div className="border-gold-line/60 bg-bg rounded-lg border p-4">
                      <p className="text-gold text-[11px] font-semibold tracking-[0.14em] uppercase">
                        Needs your confirmation
                      </p>
                      <p className="text-ink mt-1 font-medium">
                        Create an itinerary from this journey?
                      </p>
                      <div className="mt-3 flex gap-2">
                        <span className="bg-accent text-accent-contrast rounded-md px-3 py-1.5 text-xs font-medium">
                          Confirm
                        </span>
                        <span className="border-border-strong text-ink rounded-md border px-3 py-1.5 text-xs font-medium">
                          Cancel
                        </span>
                      </div>
                    </div>
                  </div>
                  <figcaption className="text-muted border-border mt-5 border-t pt-4 text-xs">
                    An illustrative exchange. In the real assistant, nothing that changes your data
                    runs until you press Confirm.
                  </figcaption>
                </figure>
              </TiltCard>
            </Reveal>
          </Container>
        </section>

        {/* ---------------------------------------------------------- Closing */}
        <section className="relative isolate overflow-hidden bg-[#08161c]">
          {closingImage ? <ParallaxBackdrop src={closingImage} /> : null}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(5,13,18,0.94),rgba(5,13,18,0.55)_55%,rgba(5,13,18,0.3))]"
          />
          <Container className="py-28 md:py-40">
            <Reveal className="max-w-2xl">
              <h2 className="text-4xl text-[#f3efe6] md:text-6xl">
                Your next trip is already somebody&rsquo;s story.
              </h2>
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-[#d6d9d2]">
                Read how it went for them, then make it yours.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#f3efe6] text-[#0b1519] shadow-lg hover:-translate-y-0.5 hover:bg-white motion-reduce:hover:translate-y-0"
                >
                  <Link href="/explore">Explore journeys</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="border-white/35 bg-transparent text-[#f3efe6] hover:bg-white/10"
                >
                  <Link href="/journeys/new">Publish a journey</Link>
                </Button>
              </div>
            </Reveal>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
