"use client";

import { useActionState } from "react";

import { resendVerificationAction } from "@/modules/auth/auth.actions";
import type { FormState } from "@/lib/forms";

const initialState: FormState = {};

export function VerifyEmailBanner({ email }: { email: string }) {
  const [state, action, pending] = useActionState(() => resendVerificationAction(), initialState);

  return (
    <div className="border-accent/30 bg-accent-soft flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
      <p className="text-ink">
        {state.message ?? (
          <>
            Confirm your email address (<span className="font-medium">{email}</span>) to unlock
            everything.
          </>
        )}
      </p>
      {!state.ok ? (
        <form action={action}>
          <button
            type="submit"
            disabled={pending}
            className="text-accent font-medium underline-offset-4 hover:underline disabled:opacity-60"
          >
            {pending ? "Sending…" : "Resend link"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
