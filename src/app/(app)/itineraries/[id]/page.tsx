import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ItineraryDeleteButton } from "@/components/globe/itinerary-delete-button";
import { ItineraryMetaForm } from "@/components/globe/itinerary-meta-form";
import { PlanEditor } from "@/components/globe/plan-editor";
import { Container } from "@/components/ui/container";
import { auth } from "@/lib/auth";
import type { ItineraryEditDto } from "@/modules/itineraries/itinerary.mappers";
import { getForEdit } from "@/modules/itineraries/itinerary.service";

type Params = { params: Promise<{ id: string }> };

async function load(userId: string, id: string): Promise<ItineraryEditDto> {
  try {
    return await getForEdit(userId, id);
  } catch {
    notFound();
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await auth();
  if (!session?.user?.id) return { title: "Itinerary" };
  const { id } = await params;
  try {
    const it = await getForEdit(session.user.id, id);
    return { title: it.title };
  } catch {
    return { title: "Itinerary" };
  }
}

export default async function ItineraryPage({ params }: Params) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user?.id) redirect(`/login?next=/itineraries/${id}`);

  const itinerary = await load(session.user.id, id);
  const place =
    [itinerary.destinationName, itinerary.country].filter(Boolean).join(", ") || "Itinerary";

  return (
    <Container className="max-w-3xl py-12">
      <p className="text-muted text-xs font-semibold tracking-[0.16em] uppercase">{place}</p>
      <h1 className="font-display text-ink mt-2 text-3xl leading-tight">{itinerary.title}</h1>
      {itinerary.sourceJourney ? (
        <p className="text-muted mt-2 text-sm">
          Forked from{" "}
          <Link
            href={`/journeys/${itinerary.sourceJourney.slug}`}
            className="text-accent font-medium hover:underline"
          >
            {itinerary.sourceJourney.title}
          </Link>
        </p>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-ink text-lg">Details</h2>
        <div className="mt-4">
          <ItineraryMetaForm itinerary={itinerary} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-ink text-lg">Plan</h2>
        <div className="mt-4">
          <PlanEditor itinerary={itinerary} />
        </div>
      </section>

      <section className="border-border mt-12 border-t pt-6">
        <ItineraryDeleteButton itineraryId={itinerary.id} />
      </section>
    </Container>
  );
}
