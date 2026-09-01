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
const PROTECTED_PREFIXES = ["/settings"];

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
      const isSignedIn = Boolean(auth?.user);
      const needsAuth = PROTECTED_PREFIXES.some(
        (prefix) => nextUrl.pathname === prefix || nextUrl.pathname.startsWith(`${prefix}/`),
      );
      return needsAuth ? isSignedIn : true;
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
