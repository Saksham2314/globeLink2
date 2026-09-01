import "server-only";

import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";

import { RESERVED_HANDLES, slugifyHandle } from "./handle";

/**
 * Derive a handle that is well-formed and not already taken. Tries the base
 * slug, then the slug with a short random suffix; falls back to a random handle
 * if the source string yields nothing usable.
 */
export async function generateUniqueHandle(source: string): Promise<string> {
  let base = slugifyHandle(source);
  if (base.length < 3) base = `traveller-${base}`.slice(0, 20);

  const candidates = [base];
  for (let i = 0; i < 5; i += 1) {
    candidates.push(`${base.slice(0, 15)}-${randomBytes(2).toString("hex")}`);
  }

  for (const candidate of candidates) {
    if (RESERVED_HANDLES.has(candidate)) continue;
    const taken = await db.user.findUnique({ where: { handle: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }

  return `traveller-${randomBytes(4).toString("hex")}`;
}
