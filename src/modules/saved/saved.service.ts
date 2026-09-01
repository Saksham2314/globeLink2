import "server-only";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { CARD_INCLUDE } from "@/modules/journeys/journey.service";
import { toCardDto, type JourneyCardDto } from "@/modules/journeys/journey.mappers";

const pk = (userId: string, journeyId: string) => ({ userId_journeyId: { userId, journeyId } });

/** Toggle the saved state for a published journey. Returns the new state. */
export async function toggleSave(userId: string, journeyId: string): Promise<{ saved: boolean }> {
  const journey = await db.journey.findUnique({
    where: { id: journeyId },
    select: { status: true, deletedAt: true },
  });
  if (!journey || journey.deletedAt || journey.status !== "PUBLISHED") {
    throw AppError.notFound("That journey isn't available");
  }

  const existing = await db.savedJourney.findUnique({ where: pk(userId, journeyId) });
  if (existing) {
    await db.savedJourney.delete({ where: pk(userId, journeyId) });
    return { saved: false };
  }
  await db.savedJourney.create({ data: { userId, journeyId } });
  return { saved: true };
}

export async function isSaved(userId: string, journeyId: string): Promise<boolean> {
  return Boolean(await db.savedJourney.findUnique({ where: pk(userId, journeyId) }));
}

/**
 * A user's saved journeys, newest-saved first. Journeys that have since been
 * unpublished or deleted are skipped. Keyset paginated on the saved journey id.
 */
export async function listSaved(
  userId: string,
  opts: { cursor?: string; limit?: number } = {},
): Promise<{ items: JourneyCardDto[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 48);

  const rows = await db.savedJourney.findMany({
    where: { userId, journey: { status: "PUBLISHED", deletedAt: null } },
    orderBy: [{ createdAt: "desc" }, { journeyId: "desc" }],
    take: limit + 1,
    ...(opts.cursor ? { cursor: pk(userId, opts.cursor), skip: 1 } : {}),
    include: { journey: { include: CARD_INCLUDE } },
  });

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const items = page.map((r) => ({ ...toCardDto(r.journey), isSaved: true }));
  const last = page[page.length - 1];
  return { items, nextCursor: hasMore && last ? last.journeyId : null };
}
