/**
 * Browser-side Sentry init. `NEXT_PUBLIC_SENTRY_DSN` is inlined at build time,
 * so when it is unset the block below is dead code and the `@sentry/nextjs`
 * client bundle is dropped entirely (no shared-JS cost).
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  });
}

/** Router-navigation instrumentation hook. Next calls this on every client
 *  navigation; it's a no-op unless Sentry is configured. */
export function onRouterTransitionStart(href: string, navigationType: string): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.captureRouterTransitionStart?.(href, navigationType);
  });
}
