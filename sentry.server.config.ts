// Sentry init for the Node.js server runtime. Only imported (dynamically, from
// instrumentation.ts) when NEXT_PUBLIC_SENTRY_DSN is set, so with no DSN the
// SDK is never pulled into the bundle.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
