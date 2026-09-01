import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NewJourneyForm } from "@/components/globe/journey-editor/new-journey-form";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "New journey" };

export default async function NewJourneyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/journeys/new");

  return (
    <div className="mx-auto w-full max-w-lg px-6 py-14 md:px-8">
      <h1 className="font-display text-ink text-2xl">Start a new journey</h1>
      <p className="text-muted mt-1 text-sm">
        Just a title to begin — you&rsquo;ll fill in the rest, then publish when it&rsquo;s ready.
      </p>
      <div className="mt-8">
        <NewJourneyForm />
      </div>
    </div>
  );
}
