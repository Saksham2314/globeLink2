"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { auth, signIn, signOut } from "@/lib/auth";
import { isAppError } from "@/lib/errors";
import { firstErrors, type FormState } from "@/lib/forms";
import { logger } from "@/lib/logger";

import { resendVerificationSchema, signInSchema, signUpSchema } from "./auth.schema";
import { registerUser, resendVerificationEmail } from "./auth.service";

const DEFAULT_REDIRECT = "/settings";

/** Only allow same-origin relative paths as a post-login destination. */
function safeRedirect(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : DEFAULT_REDIRECT;
}

/** `redirect()` and `signIn(..., { redirectTo })` throw a control-flow error
 *  that MUST propagate. Everything else is a real failure. */
function isRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  try {
    await registerUser(parsed.data);
  } catch (error) {
    if (isAppError(error) && error.code === "CONFLICT") {
      return { fieldErrors: { email: error.message } };
    }
    logger.error({ err: error }, "sign-up failed");
    return { error: "We couldn't create your account. Please try again." };
  }

  // Sign the new (unverified) user in and land them on the verification notice.
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/verify-email",
    });
  } catch (error) {
    if (isRedirect(error)) throw error;
    logger.error({ err: error }, "post-sign-up sign-in failed");
    // The account exists — send them to sign in manually.
    redirect("/login?next=/verify-email");
  }
  return { ok: true };
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeRedirect(formData.get("next")),
    });
  } catch (error) {
    if (isRedirect(error)) throw error; // successful sign-in — let it navigate
    if (error instanceof AuthError) {
      return {
        error:
          "That email and password don't match. If you signed up with Google, use “Continue with Google”.",
      };
    }
    logger.error({ err: error }, "sign-in failed unexpectedly");
    return { error: "Something went wrong signing you in. Please try again." };
  }
  return { ok: true };
}

export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  await signIn("google", { redirectTo: safeRedirect(formData.get("next")) });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function resendVerificationAction(): Promise<FormState> {
  const session = await auth();
  const parsed = resendVerificationSchema.safeParse({ email: session?.user?.email });
  if (!parsed.success) {
    return { ok: true, message: "If that address needs confirming, a link is on its way." };
  }

  const sent = await resendVerificationEmail(parsed.data.email);
  return sent
    ? { ok: true, message: "Sent — check your inbox (and spam). The link works for 24 hours." }
    : {
        ok: true,
        message:
          "We couldn't deliver to that address right now. Make sure it's correct in Settings, or try again shortly.",
      };
}
