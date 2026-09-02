import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { VerifyEmailBanner } from "@/components/globe/verify-email-banner";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/modules/users/user.service";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/verify-email");

  const me = await getCurrentUser(session.user.id);
  if (!me) redirect("/login");
  if (me.emailVerified) redirect("/");

  return (
    <div className="mx-auto w-full max-w-lg px-6 py-16 md:px-8">
      <h1 className="font-display text-ink text-2xl">Confirm your email</h1>
      <p className="text-muted mt-2 text-sm leading-relaxed">
        We&rsquo;ve sent a confirmation link to{" "}
        <span className="text-ink font-medium">{me.email}</span>. Click it to unlock itineraries, the
        assistant, messaging and journey publishing. It can take a minute to arrive — check spam too.
      </p>

      <div className="mt-6">
        <VerifyEmailBanner email={me.email} />
      </div>

      <div className="text-muted mt-6 space-y-2 text-sm">
        <p>
          Wrong address?{" "}
          <Link href="/settings" className="text-accent font-medium hover:underline">
            Update it in Settings
          </Link>
          .
        </p>
        <p>
          In the meantime you can still{" "}
          <Link href="/explore" className="text-accent font-medium hover:underline">
            explore journeys
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
