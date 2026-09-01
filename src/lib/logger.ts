import pino from "pino";

import { env } from "@/lib/env";

/**
 * Application logger.
 *
 * Emits structured single-line JSON so logs are queryable in any host
 * (Vercel, Logtail, Axiom, …). For readable local output pipe the dev server
 * through pino-pretty, e.g. `npm run dev | npx pino-pretty`.
 *
 * Always log with an object first: `logger.info({ userId }, "message")`.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { app: "globelink", env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token",
      "*.secret",
      "*.apiKey",
    ],
    censor: "[redacted]",
  },
});

export type AppLogger = typeof logger;

/** Create a child logger that stamps every line with shared context. */
export function withContext(context: Record<string, unknown>): AppLogger {
  return logger.child(context);
}
