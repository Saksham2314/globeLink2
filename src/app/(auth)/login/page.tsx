import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GoogleButton } from "@/components/globe/google-button";
import { LoginForm } from "@/components/globe/login-form";
import { FormMessage } from "@/components/ui/field";
import { auth } from "@/lib/auth";
import { isGoogleAuthEnabled } from "@/lib/env";
import { getSessionUserSummary } from "@/modules/users/user.service";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; verified?: string; verify_error?: string }>;
}) {
  const { next, verified, verify_error } = await searchParams;

  // Only treat the session as signed-in if the user still exists — a stale JWT
  // whose account is gone must fall through to the form, not bounce to
  // /settings (which redirects back here → loop).
  const session = await auth();
  const me = session?.user?.id ? await getSessionUserSummary(session.user.id) : null;
  if (me) {
    redirect(next && next.startsWith("/") ? next : "/settings");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-display text-ink text-2xl">Welcome back</h1>
        <p className="text-muted text-sm">Sign in to plan and publish journeys.</p>
      </div>

      {verified ? <FormMessage message="Email verified. You're all set — sign in." /> : null}
      {verify_error ? (
        <FormMessage error="That verification link is invalid or has expired." />
      ) : null}

      {isGoogleAuthEnabled ? (
        <>
          <GoogleButton next={next} />
          <div className="text-muted flex items-center gap-3 text-xs">
            <span className="bg-border h-px flex-1" />
            or
            <span className="bg-border h-px flex-1" />
          </div>
        </>
      ) : null}

      <LoginForm next={next} />
    </div>
  );
}
