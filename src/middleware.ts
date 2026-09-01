import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth.config";

/**
 * Route protection runs in middleware using the Edge-safe config only. The
 * `authorized` callback in authConfig decides who may proceed; Auth.js handles
 * the redirect to the sign-in page.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on everything except Next internals, the auth API, and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|icon.svg|.*\\.).*)"],
};
