import { SiteFooter } from "@/components/globe/site-footer";
import { SiteHeader } from "@/components/globe/site-header";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Container } from "@/components/ui/container";

const STEPS = [
  {
    n: "01",
    title: "Discover real journeys",
    body: "Browse trips other travellers have actually completed — the route, the real budget, day-by-day notes, and the parts that went sideways.",
  },
  {
    n: "02",
    title: "Save and make it yours",
    body: "Keep the journeys that speak to you, then fork one into an itinerary you can reshape, cost out, and adapt to your dates.",
  },
  {
    n: "03",
    title: "Plan with the assistant",
    body: "Ask in plain language. The GlobeLink assistant searches journeys and drafts itineraries — and never changes anything without your confirmation.",
  },
];

const DESTINATIONS = [
  { place: "Manali", country: "India", tone: "from-[#3c5c80] to-[#7091b0]" },
  { place: "Kyoto", country: "Japan", tone: "from-[#454f60] to-[#7b8a9d]" },
  { place: "Sintra", country: "Portugal", tone: "from-[#3a5566] to-[#6d909e]" },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* ---------------------------------------------------------------- Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-accent-soft),transparent_75%)]"
          />
          <Container className="pt-20 pb-24 md:pt-28 md:pb-32">
            <RevealGroup
              once={false}
              className="flex max-w-3xl flex-col items-start gap-6 md:gap-7"
            >
              <RevealItem className="text-muted text-xs font-semibold tracking-[0.16em] uppercase">
                Real journeys, real people
              </RevealItem>

              <RevealItem>
                <h1 className="text-ink text-4xl md:text-6xl">
                  The travel platform built on trips that actually happened.
                </h1>
              </RevealItem>

              <RevealItem className="text-muted max-w-xl text-lg leading-relaxed">
                GlobeLink is where travellers publish the journeys they&rsquo;ve completed — and
                where you find, save, and plan yours from the real thing.
              </RevealItem>

              <RevealItem className="w-full max-w-xl">
                {/* Search preview — presentational only in Phase 0. */}
                <form
                  aria-label="Search journeys (coming soon)"
                  className="border-border-strong bg-surface flex w-full items-center gap-2 rounded-lg border p-2 shadow-sm"
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
                  <input
                    type="text"
                    name="q"
                    disabled
                    placeholder="Try &ldquo;4 days in Manali under &#8377;15,000&rdquo;"
                    className="text-ink placeholder:text-muted h-10 flex-1 bg-transparent px-1 text-sm focus:outline-none"
                  />
                  <span className="bg-surface-muted text-muted rounded-md px-3 py-2 text-xs font-medium">
                    Soon
                  </span>
                </form>
                <p className="text-muted mt-3 text-xs">
                  Discovery opens up as the first journeys come online.
                </p>
              </RevealItem>

              <RevealItem>
                <ul className="flex flex-wrap gap-2">
                  {[
                    "Himalayan treks",
                    "Two weeks in Vietnam",
                    "Coastal Portugal",
                    "Slow travel",
                  ].map((chip) => (
                    <li
                      key={chip}
                      className="border-border bg-surface-muted text-muted rounded-full border px-3 py-1 text-xs"
                    >
                      {chip}
                    </li>
                  ))}
                </ul>
              </RevealItem>
            </RevealGroup>
          </Container>
        </section>

        {/* --------------------------------------------------------- How it works */}
        <section id="how-it-works" className="border-border bg-surface border-t">
          <Container className="py-20 md:py-28">
            <Reveal once={false}>
              <h2 className="text-ink max-w-2xl text-2xl md:text-3xl">
                A useful travel platform first. The assistant sits on top.
              </h2>
            </Reveal>
            <RevealGroup className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((step) => (
                <RevealItem key={step.n} className="h-full">
                  <article className="border-border bg-bg h-full rounded-lg border p-6 shadow-sm">
                    <p className="font-display text-accent text-2xl">{step.n}</p>
                    <h3 className="text-ink mt-3 text-lg">{step.title}</h3>
                    <p className="text-muted mt-2 text-sm leading-relaxed">{step.body}</p>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>
          </Container>
        </section>

        {/* ------------------------------------------------------------- Featured */}
        <section id="featured" className="border-border border-t">
          <Container className="py-20 md:py-28">
            <Reveal once={false}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-ink text-2xl md:text-3xl">Where this is heading</h2>
                <p className="text-muted text-sm">Placeholder destinations — no live data yet.</p>
              </div>
            </Reveal>
            <RevealGroup className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {DESTINATIONS.map((d) => (
                <RevealItem key={d.place}>
                  <article className="group border-border bg-surface overflow-hidden rounded-lg border shadow-sm transition-shadow duration-200 hover:shadow-md">
                    <div
                      className={`aspect-[4/3] bg-gradient-to-br ${d.tone} ring-1 ring-black/5 ring-inset`}
                    />
                    <div className="p-5">
                      <h3 className="text-ink text-lg">{d.place}</h3>
                      <p className="text-muted text-sm">{d.country}</p>
                    </div>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>
          </Container>
        </section>

        {/* ------------------------------------------------------------ Assistant */}
        <section id="assistant" className="border-border bg-surface border-t">
          <Container className="py-20 md:py-28">
            <RevealGroup once={false} className="flex max-w-2xl flex-col items-start gap-5">
              <RevealItem className="text-muted text-xs font-semibold tracking-[0.16em] uppercase">
                The assistant
              </RevealItem>
              <RevealItem>
                <h2 className="text-ink text-2xl md:text-3xl">
                  Native to the product, not bolted on.
                </h2>
              </RevealItem>
              <RevealItem className="text-muted text-base leading-relaxed">
                The GlobeLink assistant works through the same validated tools you do — it can
                search journeys, open one, and draft an itinerary, but it never touches the database
                directly and always asks before it changes anything. It arrives in a later phase;
                the foundation it runs on is being built now.
              </RevealItem>
            </RevealGroup>
          </Container>
        </section>
      </main>

      <Reveal>
        <SiteFooter />
      </Reveal>
    </>
  );
}
