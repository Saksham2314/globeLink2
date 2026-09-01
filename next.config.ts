import type { NextConfig } from "next";

/**
 * Baseline security headers applied to every route.
 * A full Content-Security-Policy is intentionally deferred to Phase 10
 * (production hardening) because it needs per-request nonces and would
 * otherwise be brittle during feature development.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // pino ships its own transports/worker files; let Next require it at runtime
  // instead of bundling it into the server output.
  serverExternalPackages: ["pino", "pino-pretty"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
