import "server-only";

import { db } from "@/lib/db";
import { assertOwnership } from "@/lib/authz";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import {
  createItinerarySchema,
  itineraryMetaSchema,
  planSchema,
  type CreateItineraryInput,
  type ItineraryMetaInput,
  type ItineraryStatusValue,
} from "./itinerary.schema";
import {
  toCardDto,
  toEditDto,
  type ItineraryCardDto,
  type ItineraryEditDto,
} from "./itinerary.mappers";

const SOURCE_SELECT = { select: { slug: true, title: true } } as const;

const FULL_INCLUDE = {
  days: { include: { items: true }, orderBy: { dayNumber: "asc" } },
  sourceJourney: SOURCE_SELECT,
} as const;

const CARD_INCLUDE = {
  days: { select: { dayNumber: true, items: { select: { cost: true } } } },
  sourceJourney: SOURCE_SELECT,
} as const;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

async function loadOwned(userId: string, id: string) {
  const itinerary = await db.itinerary.findUnique({ where: { id } });
  if (!itinerary) throw AppError.notFound("Itinerary not found");
  assertOwnership(userId, itinerary.ownerId);
  return itinerary;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function createItinerary(userId: string, input: CreateItineraryInput) {
  const { title, destinationName } = createItinerarySchema.parse(input);
  const itinerary = await db.itinerary.create({
    data: { ownerId: userId, title, destinationName, status: "DRAFT", createdBy: "USER" },
    select: { id: true },
  });
  logger.info({ userId, itineraryId: itinerary.id }, "itinerary created");
  return itinerary;
}

/** Fork a published journey into a new plan: copies the destination and the
 *  day/item structure (but not the journey's historical dates). */
export async function forkFromJourney(userId: string, journeySlug: string) {
  const journey = await db.journey.findFirst({
    where: { slug: journeySlug, status: "PUBLISHED", deletedAt: null },
    include: {
      days: { include: { stops: true }, orderBy: { dayNumber: "asc" } },
      author: { select: { handle: true, name: true } },
    },
  });
  if (!journey) throw AppError.notFound("That journey isn't available to fork");

  const attribution = journey.author.handle
    ? `Forked from @${journey.author.handle}'s journey.`
    : journey.author.name
      ? `Forked from ${journey.author.name}'s journey.`
      : null;

  const created = await db.itinerary.create({
    data: {
      ownerId: userId,
      title: journey.title,
      destinationName: journey.destinationName,
      country: journey.country,
      currency: journey.budgetCurrency,
      notes: attribution,
      sourceJourneyId: journey.id,
      createdBy: "USER",
      days: {
        create: journey.days.map((d) => ({
          dayNumber: d.dayNumber,
          title: d.title,
          notes: d.notes,
          items: {
            create: [...d.stops]
              .sort((a, b) => a.position - b.position)
              .map((s, i) => ({
                position: i,
                time: s.time,
                type: s.type,
                title: s.title,
                description: s.description,
                locationName: s.locationName,
                cost: s.cost,
                costCurrency: s.costCurrency,
              })),
          },
        })),
      },
    },
    select: { id: true },
  });

  logger.info({ userId, itineraryId: created.id, journeyId: journey.id }, "itinerary forked");
  return created;
}

export async function getForEdit(userId: string, id: string): Promise<ItineraryEditDto> {
  const itinerary = await db.itinerary.findUnique({ where: { id }, include: FULL_INCLUDE });
  if (!itinerary) throw AppError.notFound("Itinerary not found");
  assertOwnership(userId, itinerary.ownerId);
  return toEditDto(itinerary);
}

export async function listMine(
  userId: string,
  opts: { cursor?: string; limit?: number } = {},
): Promise<{ items: ItineraryCardDto[]; nextCursor: string | null }> {
  const limit = clamp(opts.limit ?? 24, 1, 48);

  const rows = await db.itinerary.findMany({
    where: { ownerId: userId },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    include: CARD_INCLUDE,
  });

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return { items: page.map(toCardDto), nextCursor: hasMore && last ? last.id : null };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function updateMeta(userId: string, id: string, input: ItineraryMetaInput) {
  await loadOwned(userId, id);
  const d = itineraryMetaSchema.parse(input);
  await db.itinerary.update({
    where: { id },
    data: {
      title: d.title,
      destinationName: d.destinationName,
      country: d.country,
      startDate: d.startDate ?? null,
      endDate: d.endDate ?? null,
      status: d.status,
      currency: d.currency,
      notes: d.notes,
    },
  });
}

export async function updateStatus(userId: string, id: string, status: ItineraryStatusValue) {
  await loadOwned(userId, id);
  await db.itinerary.update({ where: { id }, data: { status } });
}

/** Replace the whole plan in one transaction — delete + recreate, like the
 *  journey editor. */
export async function replacePlan(userId: string, id: string, input: unknown) {
  await loadOwned(userId, id);
  const { days } = planSchema.parse(input);

  await db.$transaction(async (tx) => {
    await tx.planDay.deleteMany({ where: { itineraryId: id } });
    for (const [i, day] of days.entries()) {
      await tx.planDay.create({
        data: {
          itineraryId: id,
          dayNumber: i + 1,
          title: day.title,
          date: day.date ?? null,
          notes: day.notes,
          items: {
            create: day.items.map((item, j) => ({
              position: j,
              time: item.time,
              type: item.type,
              title: item.title,
              description: item.description,
              locationName: item.locationName,
              cost: item.cost ?? null,
            })),
          },
        },
      });
    }
    await tx.itinerary.update({ where: { id }, data: { updatedAt: new Date() } });
  });
}

export async function deleteItinerary(userId: string, id: string) {
  await loadOwned(userId, id);
  await db.itinerary.delete({ where: { id } });
  logger.info({ userId, itineraryId: id }, "itinerary deleted");
}
