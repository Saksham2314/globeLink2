import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Validated, strongly-typed environment access.
 *
 * Import `env` anywhere on the server (and `env.NEXT_PUBLIC_*` on the client)
 * instead of reading `process.env` directly. If a required variable is missing
 * or malformed the process fails fast at startup with a readable error, so a
 * misconfigured deploy never reaches users.
 */
export const env = createEnv({
  /**
   * Server-only variables. Never exposed to the browser bundle.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    /** Pooled Postgres connection used by the app at runtime. */
    DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string"),

    /** Direct (unpooled) Postgres connection used by Prisma Migrate. Optional in
     *  environments that do not run migrations (e.g. the browser build). */
    DIRECT_URL: z.string().url("DIRECT_URL must be a valid connection string").optional(),

    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),

    // ---- Auth.js -----------------------------------------------------------
    /** Secret used to sign session JWTs and CSRF tokens. Generate with
     *  `openssl rand -base64 32` (or `npx auth secret`). Auth.js also reads this
     *  variable name directly. */
    AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),

    /** Google OAuth credentials. Optional: the Google sign-in provider is only
     *  registered when both are present. Auth.js reads these names directly. */
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),

    // ---- Email (SMTP) -------------------------------------------------
    /** SMTP transport for transactional email (nodemailer). All four are needed
     *  to send; with any missing, the message — verification link included — is
     *  logged to the server console instead, so local dev still works.
     *  For Gmail: host smtp.gmail.com, port 465, user = the Gmail address,
     *  pass = a Google App Password. No verified domain required. */
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(465),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    /** From-address for transactional email, e.g. "GlobeLink <you@gmail.com>".
     *  With Gmail SMTP this must be the authenticated address (or an alias). */
    EMAIL_FROM: z.string().default("GlobeLink <no-reply@globelink.local>"),

    // ---- Blob storage (Vercel Blob) ----------------------------------
    /** Read/write token for the Vercel Blob store. Auto-provisioned by
     *  `vercel blob create-store` into .env.local and the project env.
     *  Optional so builds without it still pass; image upload requires it. */
    BLOB_READ_WRITE_TOKEN: z.string().optional(),

    // ---- AI (Anthropic) --------------------------------------------
    /** Anthropic API key for the AI layer (constraint extraction now; the agent
     *  loop later). Optional: when absent, AI features degrade gracefully —
     *  natural-language search falls back to plain text search and every other
     *  feature is unaffected. Server-only; set a spend cap on the key. */
    ANTHROPIC_API_KEY: z.string().optional(),
  },

  /**
   * Client-exposed variables. Must be prefixed with `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

    /** Sentry DSN. Optional and not secret; the single switch for the whole
     *  Sentry integration. Unset → the SDK and its build plugin are dropped from
     *  the bundle entirely (see src/instrumentation*.ts, next.config.ts). */
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  },

  /**
   * Next.js inlines `process.env.NEXT_PUBLIC_*` but not arbitrary keys, so each
   * variable has to be destructured here explicitly.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },

  /** Treat empty strings (`FOO=`) as undefined so defaults apply. */
  emptyStringAsUndefined: true,

  /** Allow `SKIP_ENV_VALIDATION=1` for Docker builds / linting / CI type checks. */
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
});

/** Whether Google OAuth is configured. Used to conditionally register the
 *  provider and to show/hide the "Continue with Google" button. */
export const isGoogleAuthEnabled = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);

/** Whether a real SMTP transport is configured. When false, emails are logged
 *  to the server console instead of sent. */
export const isEmailEnabled = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

/** Whether Blob image storage is configured. */
export const isBlobEnabled = Boolean(env.BLOB_READ_WRITE_TOKEN);

/** Whether the AI layer can call a model. When false, AI features fall back
 *  (natural-language search → plain text search) and nothing else changes. */
export const isAiEnabled = Boolean(env.ANTHROPIC_API_KEY);

/** Whether Sentry error tracking is wired up. */
export const isSentryEnabled = Boolean(env.NEXT_PUBLIC_SENTRY_DSN);
