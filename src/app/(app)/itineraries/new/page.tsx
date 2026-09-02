import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NewItineraryForm } from "@/components/globe/new-itinerary-form";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "New itinerary" };

export default async function NewItineraryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/itineraries/new");

  return (
    <div className="mx-auto w-full max-w-lg px-6 py-14 md:px-8">
      <h1 className="font-display text-ink text-2xl">New itinerary</h1>
      <p className="text-muted mt-1 text-sm">
        Just a title to begin — add days, stops and costs on the next screen.
      </p>
      <div className="mt-8">
        <NewItineraryForm />
      </div>
    </div>
  );
}
