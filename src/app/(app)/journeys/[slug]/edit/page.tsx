import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { JourneyBasicsForm } from "@/components/globe/journey-editor/journey-basics-form";
import { JourneyBudgetForm } from "@/components/globe/journey-editor/journey-budget-form";
import { JourneyContentForm } from "@/components/globe/journey-editor/journey-content-form";
import { JourneyImagesManager } from "@/components/globe/journey-editor/journey-images-manager";
import { JourneyPublishBar } from "@/components/globe/journey-editor/journey-publish-bar";
import { JourneyRouteForm } from "@/components/globe/journey-editor/journey-route-form";
import { ItineraryEditor } from "@/components/globe/journey-editor/itinerary-editor";
import { auth } from "@/lib/auth";
import { isAppError } from "@/lib/errors";
import { publishRequirements } from "@/modules/journeys/journey.schema";
import { getForEdit } from "@/modules/journeys/journey.service";

export const metadata: Metadata = { title: "Edit journey" };

type Params = { params: Promise<{ slug: string }> };

export default async function EditJourneyPage({ params }: Params) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?next=/journeys/${slug}/edit`);

  let journey;
  try {
    journey = await getForEdit(session.user.id, slug);
  } catch (error) {
    if (isAppError(error) && (error.code === "NOT_FOUND" || error.code === "FORBIDDEN")) {
      notFound();
    }
    throw error;
  }

  const requirements = publishRequirements({
    title: journey.title,
    destinationName: journey.destinationName,
    summary: journey.summary,
    description: journey.description,
    startDate: journey.startDate ? new Date(journey.startDate) : null,
    durationDays: journey.durationDays,
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 md:px-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-ink text-2xl">{journey.title || "Untitled journey"}</h1>
        <Link href={`/journeys/${journey.slug}`} className="text-accent text-sm hover:underline">
          Preview
        </Link>
      </div>

      <div className="mt-8 space-y-10">
        <JourneyPublishBar
          journeyId={journey.id}
          slug={journey.slug}
          status={journey.status}
          requirements={requirements}
        />

        <Section title="Basics" desc="Title, summary and where the trip went.">
          <JourneyBasicsForm journey={journey} />
        </Section>

        <Section title="Dates" desc="Exact dates, or just how many days.">
          <JourneyRouteForm journey={journey} />
        </Section>

        <Section title="Budget & style" desc="Roughly what it cost and how you travelled.">
          <JourneyBudgetForm journey={journey} />
        </Section>

        <Section title="Itinerary" desc="Day by day. Add stops, reorder with the arrows.">
          <ItineraryEditor journey={journey} />
        </Section>

        <Section title="Story & tips" desc="The write-up and practical advice.">
          <JourneyContentForm journey={journey} />
        </Section>

        <Section title="Photos" desc="The first photo is the cover unless you choose another.">
          <JourneyImagesManager journey={journey} />
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-ink text-lg">{title}</h2>
        <p className="text-muted text-sm">{desc}</p>
      </div>
      {children}
    </section>
  );
}
