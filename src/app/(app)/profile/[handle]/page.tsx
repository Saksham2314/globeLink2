import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JourneyCard } from "@/components/globe/journey-card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { listByAuthorHandle } from "@/modules/journeys/journey.service";
import { getCurrentUser, getPublicProfileByHandle } from "@/modules/users/user.service";

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPublicProfileByHandle(handle);
  if (!profile) return { title: "Profile not found" };
  return {
    title: profile.name ? `${profile.name} (@${profile.handle})` : `@${profile.handle}`,
    description: profile.bio ?? undefined,
  };
}

const titleCase = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

export default async function ProfilePage({ params }: Params) {
  const { handle } = await params;
  const profile = await getPublicProfileByHandle(handle);
  if (!profile) notFound();

  const session = await auth();
  const me = session?.user?.id ? await getCurrentUser(session.user.id) : null;
  const viewingOwn = me?.handle === profile.handle;

  const journeys = await listByAuthorHandle(handle, { viewerId: session?.user?.id });

  const { preferences } = profile;
  const initial = (profile.name ?? profile.handle).trim().charAt(0).toUpperCase() || "?";
  const memberSince = new Date(profile.memberSince).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const tagRows: { heading: string; values: string[] }[] = [];
  if (preferences.homeRegion)
    tagRows.push({ heading: "Usually travels from", values: [preferences.homeRegion] });
  if (preferences.pace) tagRows.push({ heading: "Pace", values: [titleCase(preferences.pace)] });
  if (preferences.budgetTier)
    tagRows.push({ heading: "Budget", values: [titleCase(preferences.budgetTier)] });
  if (preferences.styles.length)
    tagRows.push({ heading: "Travel style", values: preferences.styles.map(titleCase) });
  if (preferences.interests.length)
    tagRows.push({ heading: "Interests", values: preferences.interests.map(titleCase) });
  if (preferences.dietary.length)
    tagRows.push({ heading: "Dietary", values: preferences.dietary.map(titleCase) });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 md:px-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span className="border-border-strong bg-surface-muted text-ink flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border text-2xl font-medium">
          {profile.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.image} alt="" className="size-full object-cover" />
          ) : (
            initial
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-ink text-2xl">{profile.name ?? `@${profile.handle}`}</h1>
          <p className="text-muted text-sm">
            @{profile.handle} · Member since {memberSince}
          </p>
        </div>
        {viewingOwn ? (
          <Button asChild variant="secondary" size="sm">
            <Link href="/settings">Edit profile</Link>
          </Button>
        ) : null}
      </header>

      {profile.bio ? (
        <p className="text-ink mt-6 max-w-prose text-[0.95rem] leading-relaxed">{profile.bio}</p>
      ) : null}

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-ink text-xl">
            Journeys
            {journeys.length > 0 ? (
              <span className="text-muted ml-2 text-sm font-normal">{journeys.length}</span>
            ) : null}
          </h2>
          {viewingOwn ? (
            <Button asChild size="sm">
              <Link href="/journeys/new">New journey</Link>
            </Button>
          ) : null}
        </div>

        {journeys.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {journeys.map((j) => (
              <JourneyCard key={j.slug} journey={j} />
            ))}
          </div>
        ) : (
          <p className="text-muted mt-4 text-sm">
            {viewingOwn ? "You haven't published a journey yet." : "No published journeys yet."}
          </p>
        )}
      </section>

      {tagRows.length > 0 ? (
        <div className="mt-8 space-y-6">
          {tagRows.map((row) => (
            <div key={row.heading}>
              <p className="text-muted text-xs font-semibold tracking-[0.12em] uppercase">
                {row.heading}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {row.values.map((v) => (
                  <span
                    key={v}
                    className="border-border bg-surface-muted text-ink rounded-full border px-3 py-1 text-sm"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted mt-8 text-sm">
          {viewingOwn ? "Add your travel preferences in settings." : "No preferences shared yet."}
        </p>
      )}
    </div>
  );
}
