"use server";

import { AuthError } from "next-auth";

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

  // Signs the new user in and redirects (throws NEXT_REDIRECT — must propagate).
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: DEFAULT_REDIRECT,
  });
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
    if (error instanceof AuthError) {
      return { error: "That email and password don't match." };
    }
    throw error; // redirect
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
  if (parsed.success) {
    await resendVerificationEmail(parsed.data.email);
  }
  return { ok: true, message: "Verification email sent. Check your inbox." };
}
