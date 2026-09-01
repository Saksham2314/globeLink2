import type { Session } from "next-auth";

import { AppError } from "@/lib/errors";

/**
 * Authorization guards for the service layer.
 *
 * The rule from the architecture doc: routes/actions authenticate, services do
 * the resource-level check. These are the primitives for the second part. They
 * will grow (roles, per-resource policies) as features land — for now, "are you
 * signed in" and "do you own this" cover everything.
 */

export interface AuthedSession extends Session {
  user: Session["user"] & { id: string };
}

/** Narrow a possibly-null session to an authenticated one, or 401. */
export function requireSession(session: Session | null): AuthedSession {
  if (!session?.user?.id) {
    throw AppError.unauthorized();
  }
  return session as AuthedSession;
}

/** 403 unless the acting user owns the resource. */
export function assertOwnership(actingUserId: string, ownerId: string): void {
  if (actingUserId !== ownerId) {
    throw AppError.forbidden();
  }
}
