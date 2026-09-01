import { Resend } from "resend";

import { env, isEmailEnabled } from "@/lib/env";
import { logger } from "@/lib/logger";

const resend = isEmailEnabled ? new Resend(env.RESEND_API_KEY) : null;

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send a transactional email. Best-effort: never throws.
 *
 * - No RESEND_API_KEY  → the message (link included) is logged to the server
 *   console, so email-dependent flows still work in local development.
 * - Send fails (e.g. Resend's shared sender rejecting a non-owner recipient
 *   before a domain is verified) → logged and reported via the return value.
 *
 * Callers such as sign-up must not fail just because the email didn't go out —
 * the user can request a fresh link later.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailInput): Promise<{ ok: boolean }> {
  if (!resend) {
    logger.warn({ to, subject, text }, "email not sent (RESEND_API_KEY unset) — logged instead");
    return { ok: false };
  }

  try {
    const { error } = await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html, text });
    if (error) {
      logger.error({ err: error, to, subject }, "email send rejected by provider");
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    logger.error({ err: error, to, subject }, "email send threw");
    return { ok: false };
  }
}
