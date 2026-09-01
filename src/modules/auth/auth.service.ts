import "server-only";

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { generateUniqueHandle } from "@/modules/users/handle.server";

import { signUpSchema, type SignUpInput } from "./auth.schema";
import { buildVerificationEmail } from "./emails/verification-email";
import { hashPassword } from "./password";
import { consumeEmailVerificationToken, createEmailVerificationToken } from "./verification";

/**
 * Create a credentials-based account: hash the password, provision the user and
 * an empty preferences row, then send an email-verification link.
 *
 * Throws `AppError.conflict` if the email is already registered.
 */
export async function registerUser(input: SignUpInput): Promise<{ id: string; email: string }> {
  const { name, email, password } = signUpSchema.parse(input);

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw AppError.conflict("An account with that email already exists");
  }

  const [passwordHash, handle] = await Promise.all([
    hashPassword(password),
    generateUniqueHandle(name || email.split("@")[0] || "traveller"),
  ]);

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      handle,
      preferences: { create: {} },
    },
    select: { id: true, email: true, name: true },
  });

  await sendVerificationEmail(user.email, user.name);
  logger.info({ userId: user.id }, "user registered");

  return { id: user.id, email: user.email };
}

/** Issue a fresh verification token and email it. Safe to call repeatedly. */
export async function sendVerificationEmail(email: string, name?: string | null): Promise<void> {
  const token = await createEmailVerificationToken(email);
  const { subject, html, text } = buildVerificationEmail(token, name);
  await sendEmail({ to: email, subject, html, text });
}

/**
 * Resend verification for an as-yet-unverified account. Never reveals whether
 * the address exists or its verification state.
 */
export async function resendVerificationEmail(email: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { email },
    select: { email: true, name: true, emailVerified: true },
  });
  if (user && !user.emailVerified) {
    await sendVerificationEmail(user.email, user.name);
  }
}

/**
 * Consume a verification token and mark the matching account verified.
 * @returns `true` when an account was verified (or already was), `false` for an
 *          invalid/expired token.
 */
export async function verifyEmailByToken(token: string): Promise<boolean> {
  const email = await consumeEmailVerificationToken(token);
  if (!email) return false;

  await db.user.updateMany({
    where: { email, emailVerified: null },
    data: { emailVerified: new Date() },
  });
  logger.info({ email }, "email verified");
  return true;
}
