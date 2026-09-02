import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ItineraryCard } from "@/components/globe/itinerary-card";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { listMine } from "@/modules/itineraries/itinerary.service";

export const metadata: Metadata = { title: "Itineraries" };

export default async function ItinerariesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/itineraries");

  const { items } = await listMine(session.user.id);

  return (
    <Container className="py-12">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-ink text-3xl">Itineraries</h1>
          <p className="text-muted mt-1 text-sm">Your personal trip plans.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/itineraries/new">New itinerary</Link>
        </Button>
      </header>

      {items.length === 0 ? (
        <div className="border-border rounded-lg border border-dashed py-16 text-center">
          <p className="text-ink text-sm font-medium">No itineraries yet.</p>
          <p className="text-muted mt-1 text-sm">
            Start one from scratch, or fork a journey you like from{" "}
            <Link href="/explore" className="text-accent font-medium hover:underline">
              Explore
            </Link>
            .
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/itineraries/new">New itinerary</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <ItineraryCard key={it.id} itinerary={it} />
          ))}
        </div>
      )}
    </Container>
  );
}
