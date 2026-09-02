import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config.
 *
 * `middleware.ts` runs on the Edge runtime, which cannot load Prisma or bcrypt.
 * So the pieces the middleware needs — the sign-in page path and the route
 * authorization rule — live here, free of any Node-only import. The full config
 * in `auth.ts` spreads this and adds the Prisma adapter and providers.
 */

/** Route prefixes that require a signed-in user. */
const PROTECTED_PREFIXES = ["/settings", "/saved", "/messages", "/itineraries", "/journeys/new"];

/** Also protected: creating/editing a journey. `/journeys/<slug>` (view) is public. */
function requiresAuth(pathname: string): boolean {
  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  return pathname.startsWith("/journeys/") && pathname.endsWith("/edit");
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [], // real providers are added in auth.ts
  callbacks: {
    /**
     * Gate protected routes. Returning `false` makes Auth.js redirect to the
     * sign-in page with a `callbackUrl` back to the requested path.
     */
    authorized({ auth, request: { nextUrl } }) {
      return requiresAuth(nextUrl.pathname) ? Boolean(auth?.user) : true;
    },
    /** Carry the user id from the token onto the session. */
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
