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
 * Send a transactional email.
 *
 * With no RESEND_API_KEY configured this logs the message (including any link in
 * the text body) to the server console instead of sending, so flows that depend
 * on email still work end to end in local development.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<void> {
  if (!resend) {
    logger.warn({ to, subject, text }, "email not sent (RESEND_API_KEY unset) — logged instead");
    return;
  }

  const { error } = await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html, text });
  if (error) {
    logger.error({ err: error, to, subject }, "failed to send email");
    throw new Error(`Email send failed: ${error.message}`);
  }
}
