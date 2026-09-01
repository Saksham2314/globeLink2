import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /** Shape of `session.user` returned by `auth()` and `useSession()`. */
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** User id, mirrored onto the session in the `session` callback. */
    id?: string;
  }
}
