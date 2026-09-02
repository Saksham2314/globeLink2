/**
 * Content-Security-Policy, shipped **Report-Only** in Phase 10.
 *
 * Report-Only means the browser never blocks anything — it just POSTs a report
 * to `/api/csp-report` for every would-be violation. We watch those, tighten the
 * directives, then flip the header name to the enforcing `Content-Security-Policy`
 * in a follow-up once it's proven clean.
 *
 * The nonce is generated per request in `middleware.ts` and threaded to the one
 * inline script we own (the no-flash theme script in the root layout).
 */

const BLOB_HOST = "https://*.public.blob.vercel-storage.com";
const GOOGLE_AVATAR_HOST = "https://lh3.googleusercontent.com";

export function buildContentSecurityPolicy(nonce: string, isDev: boolean): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'strict-dynamic' lets the nonce'd bootstrap script load Next's chunks.
    // Dev needs 'unsafe-eval' (React refresh / source maps).
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // React sets inline style props; nonced styles would break them.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", BLOB_HOST, GOOGLE_AVATAR_HOST],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...(isDev ? ["ws:", "wss:"] : [])],
    "frame-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "report-uri": ["/api/csp-report"],
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}
