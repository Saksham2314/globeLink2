import "server-only";

import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";

import { slugifyTitle } from "./journey.slug";

/**
 * A slug unique across all journeys. The base slug always gets a short random
 * suffix so slugs stay stable if the title later changes and two "Weekend in
 * Goa" journeys don't collide.
 */
export async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugifyTitle(title) || "journey";

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = `${base.slice(0, 54)}-${randomBytes(3).toString("hex")}`;
    const taken = await db.journey.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }

  return `journey-${randomBytes(6).toString("hex")}`;
}
