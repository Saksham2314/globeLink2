import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/modules/users/user.service";
import type { CurrentUserDto } from "@/modules/users/user.mappers";

/**
 * Gate for pages that need a **verified** account. Reads the user fresh from the
 * database (so a just-verified user isn't blocked by a stale JWT), and:
 *
 * - not signed in → `/login?next=…`
 * - signed in but the account no longer exists → `/login`
 * - signed in, unverified → `/verify-email`
 *
 * Everything the assistant, itineraries, messaging and journey editing touches
 * is behind this; `/explore`, public journey pages and `/settings` are not.
 */
export async function requireVerifiedUser(next?: string): Promise<CurrentUserDto> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  const me = await getCurrentUser(session.user.id);
  if (!me) redirect("/login");
  if (!me.emailVerified) redirect("/verify-email");
  return me;
}
