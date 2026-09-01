import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GoogleButton } from "@/components/globe/google-button";
import { SignupForm } from "@/components/globe/signup-form";
import { auth } from "@/lib/auth";
import { isGoogleAuthEnabled } from "@/lib/env";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect("/settings");

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-display text-ink text-2xl">Create your account</h1>
        <p className="text-muted text-sm">
          Publish the journeys you&rsquo;ve taken and plan the ones you haven&rsquo;t.
        </p>
      </div>

      {isGoogleAuthEnabled ? (
        <>
          <GoogleButton />
          <div className="text-muted flex items-center gap-3 text-xs">
            <span className="bg-border h-px flex-1" />
            or
            <span className="bg-border h-px flex-1" />
          </div>
        </>
      ) : null}

      <SignupForm />

      <p className="text-muted text-center text-xs">
        We&rsquo;ll send a link to confirm your email address.
      </p>
    </div>
  );
}
