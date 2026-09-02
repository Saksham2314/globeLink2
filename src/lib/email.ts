import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import { env, isEmailEnabled } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Transactional email over SMTP (nodemailer). Built for Gmail SMTP with an
 * app password, which needs no verified sending domain — see docs/operations.md.
 *
 * Best-effort: `sendEmail` never throws. When SMTP isn't configured, the message
 * (verification link included) is logged to the server console so email-gated
 * flows still work in local development. Callers such as sign-up must not fail
 * just because the email didn't go out — the user can request a fresh link.
 */

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let transporter: Transporter | null = null;

function getTransport(): Transporter | null {
  if (!isEmailEnabled) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailInput): Promise<{ ok: boolean }> {
  const transport = getTransport();
  if (!transport) {
    logger.warn({ to, subject, text }, "email not sent (SMTP not configured) — logged instead");
    return { ok: false };
  }

  try {
    await transport.sendMail({ from: env.EMAIL_FROM, to, subject, text, html });
    return { ok: true };
  } catch (error) {
    logger.error({ err: error, to, subject }, "email send failed");
    return { ok: false };
  }
}
