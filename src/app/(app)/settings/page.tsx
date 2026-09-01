import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PreferencesForm } from "@/components/globe/preferences-form";
import { ProfileForm } from "@/components/globe/profile-form";
import { VerifyEmailBanner } from "@/components/globe/verify-email-banner";
import { FormMessage } from "@/components/ui/field";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/modules/users/user.service";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const { verified } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/settings");

  const me = await getCurrentUser(session.user.id);
  if (!me) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 md:px-8">
      <header className="space-y-1">
        <h1 className="font-display text-ink text-3xl">Settings</h1>
        <p className="text-muted text-sm">{me.email}</p>
      </header>

      <div className="mt-8 space-y-8">
        {verified ? <FormMessage message="Your email is verified. Thanks!" /> : null}
        {!me.emailVerified ? <VerifyEmailBanner email={me.email} /> : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-ink text-lg">Profile</h2>
            <p className="text-muted text-sm">This is what other travellers see.</p>
          </div>
          <ProfileForm
            defaultValues={{
              name: me.name ?? "",
              handle: me.handle,
              bio: me.bio ?? "",
            }}
          />
        </section>

        <div className="bg-border h-px" />

        <section className="space-y-4">
          <div>
            <h2 className="text-ink text-lg">Travel preferences</h2>
            <p className="text-muted text-sm">
              Helps tailor recommendations — and, later, the assistant.
            </p>
          </div>
          <PreferencesForm defaultValues={me.preferences} />
        </section>
      </div>
    </div>
  );
}
