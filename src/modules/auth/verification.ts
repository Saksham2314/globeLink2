import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";

/** How long an email-verification link stays valid. */
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Issue a fresh single-use email-verification token for `email`, replacing any
 * outstanding one. Reuses the Auth.js `verification_tokens` table with
 * `identifier` = email.
 */
export async function createEmailVerificationToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await db.verificationToken.deleteMany({ where: { identifier: email } });
  await db.verificationToken.create({ data: { identifier: email, token, expires } });

  return token;
}

/**
 * Validate and burn a verification token.
 * @returns the email it was issued for, or `null` if missing/expired.
 */
export async function consumeEmailVerificationToken(token: string): Promise<string | null> {
  const record = await db.verificationToken.findUnique({ where: { token } });
  if (!record) return null;

  // Single use, regardless of outcome.
  await db.verificationToken.delete({ where: { token } }).catch(() => undefined);

  if (record.expires.getTime() < Date.now()) return null;
  return record.identifier;
}
