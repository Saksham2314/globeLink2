import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Sink for Content-Security-Policy-Report-Only violation reports. Browsers POST
 * here (as `application/csp-report` or `application/reports+json`) whenever the
 * policy *would* have blocked something. We only log — the data tells us what to
 * allowlist before flipping CSP to enforcing.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    // Single report: { "csp-report": {...} }. Reporting API: [{ body: {...} }].
    const report = Array.isArray(body) ? body[0]?.body : (body?.["csp-report"] ?? body);
    if (report) {
      logger.warn(
        {
          csp: {
            blockedURI: report["blocked-uri"] ?? report.blockedURL,
            violatedDirective: report["violated-directive"] ?? report.effectiveDirective,
            documentURI: report["document-uri"] ?? report.documentURL,
          },
        },
        "CSP report-only violation",
      );
    }
  } catch {
    // Malformed report — ignore.
  }
  return new Response(null, { status: 204 });
}
