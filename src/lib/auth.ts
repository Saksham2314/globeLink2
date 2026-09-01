import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { authConfig } from "@/lib/auth.config";
import { db } from "@/lib/db";
import { isGoogleAuthEnabled } from "@/lib/env";
import { logger } from "@/lib/logger";
import { signInSchema } from "@/modules/auth/auth.schema";
import { verifyPassword } from "@/modules/auth/password";
import { generateUniqueHandle } from "@/modules/users/handle.server";

const credentials = Credentials({
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(raw) {
    const parsed = signInSchema.safeParse(raw);
    if (!parsed.success) return null;

    const { email, password } = parsed.data;
    const user = await db.user.findUnique({ where: { email } });
    if (!user?.passwordHash) return null;

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return null;

    return { id: user.id, email: user.email, name: user.name, image: user.image };
  },
});

const google = Google({
  // `allowDangerousEmailAccountLinking`: a Google sign-in is merged into an
  // existing account with the same email. Safe here — Google verifies emails,
  // and our credentials sign-up path requires verification too.
  allowDangerousEmailAccountLinking: true,
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name,
      email: profile.email,
      image: profile.picture,
      emailVerified: profile.email_verified ? new Date() : null,
    };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  // Credentials sign-in is incompatible with the database session strategy, so
  // sessions are stateless JWTs. See docs/adr/0003-*.md for the tradeoff.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  providers: isGoogleAuthEnabled ? [credentials, google] : [credentials],
  events: {
    signIn({ user, account }) {
      logger.info({ userId: user.id, provider: account?.provider }, "sign in");
    },
    /**
     * Adapter-created accounts (OAuth) arrive without a handle or preferences
     * row — the credentials path sets both in registerUser. Backfill here.
     */
    async createUser({ user }) {
      if (!user.id) return;
      const handle = await generateUniqueHandle(user.name || user.email || "traveller");
      await db.user.update({
        where: { id: user.id },
        data: { handle, preferences: { create: {} } },
      });
      logger.info({ userId: user.id }, "oauth user provisioned");
    },
  },
});
