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
  },

  /**
   * Client-exposed variables. Must be prefixed with `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
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
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  /** Treat empty strings (`FOO=`) as undefined so defaults apply. */
  emptyStringAsUndefined: true,

  /** Allow `SKIP_ENV_VALIDATION=1` for Docker builds / linting / CI type checks. */
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
});
