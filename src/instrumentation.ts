/**
 * Next.js instrumentation hook. Sentry is loaded only when
 * `NEXT_PUBLIC_SENTRY_DSN` is set — that value is inlined at build time, so an
 * unconfigured build dead-code-eliminates the dynamic imports below and the
 * Sentry SDK never enters the server or edge (middleware) bundle.
 */
export async function register(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

/** Forward nested RSC render errors to Sentry (no-op when Sentry is off). */
export async function onRequestError(
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
