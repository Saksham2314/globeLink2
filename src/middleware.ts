import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";
import { buildContentSecurityPolicy } from "@/lib/csp";

/**
 * Route protection runs in middleware using the Edge-safe config only. The
 * `authorized` callback in authConfig decides who may proceed; Auth.js handles
 * the redirect to the sign-in page.
 *
 * This wrapper also attaches a per-request CSP nonce and a **Report-Only**
 * Content-Security-Policy header (see src/lib/csp.ts).
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildContentSecurityPolicy(nonce, process.env.NODE_ENV !== "production");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy-Report-Only", csp);
  return res;
});

export const config = {
  // Run on everything except Next internals, the auth API, and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|icon.svg|.*\\.).*)"],
};
