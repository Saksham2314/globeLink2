import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { verifyEmailByToken } from "@/modules/auth/auth.service";

export const runtime = "nodejs";

/**
 * GET /api/auth/verify-email?token=…
 *
 * Target of the link in the verification email. Consumes the token, marks the
 * account verified, then bounces to a friendly page.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const ok = token ? await verifyEmailByToken(token) : false;

  const session = await auth();
  const base = env.NEXT_PUBLIC_APP_URL;
  const destination = ok
    ? session?.user
      ? `${base}/settings?verified=1`
      : `${base}/login?verified=1`
    : `${base}/login?verify_error=1`;

  return NextResponse.redirect(destination);
}
