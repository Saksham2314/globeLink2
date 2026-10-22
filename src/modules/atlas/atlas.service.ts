import "server-only";

import { db } from "@/lib/db";

import { buildAtlasData } from "./atlas.build";
import type { AtlasData } from "./atlas.types";

const MAX_JOURNEYS = 60;
const DAYS_PREVIEW = 6;

/**
 * Destinations for the landing globe — built only from PUBLISHED journeys.
 *
 * A journey's own `lat`/`lng` win when present; otherwise its destination name
 * (and stated country) go through the gazetteer. Journeys that can't be placed
 * are simply not on the globe. Grouping lives in `buildAtlasData` (pure).
 */
export async function getAtlasData(viewerId?: string): Promise<AtlasData> {
  const journeys = await db.journey.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: MAX_JOURNEYS,
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      originName: true,
      destinationName: true,
      country: true,
      lat: true,
      lng: true,
      durationDays: true,
      budgetAmount: true,
      budgetCurrency: true,
      images: { select: { url: true, isCover: true, position: true } },
      days: {
        select: { dayNumber: true, title: true },
        orderBy: { dayNumber: "asc" },
        take: DAYS_PREVIEW,
      },
      author: { select: { name: true, handle: true } },
    },
  });

  const saved = viewerId
    ? new Set(
        (
          await db.savedJourney.findMany({
            where: { userId: viewerId, journeyId: { in: journeys.map((j) => j.id) } },
            select: { journeyId: true },
          })
        ).map((s) => s.journeyId),
      )
    : null;

  return buildAtlasData(journeys, saved);
}
