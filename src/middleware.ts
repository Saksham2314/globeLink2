import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig, requiresAuth } from "@/lib/auth.config";
import { buildContentSecurityPolicy } from "@/lib/csp";

/**
 * Middleware does two things on the Edge:
 *
 * 1. Route protection — redirect signed-out users away from protected routes to
 *    `/login?next=<path>`. (Supplying a handler function to `auth()` means the
 *    `authorized` callback is no longer auto-applied, so the check runs here.)
 * 2. A per-request CSP nonce + a **Report-Only** Content-Security-Policy header
 *    (see src/lib/csp.ts).
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;

  if (requiresAuth(nextUrl.pathname) && !req.auth?.user) {
    const signIn = new URL("/login", nextUrl.origin);
    signIn.searchParams.set("next", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(signIn);
  }

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
