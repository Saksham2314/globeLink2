import "server-only";

import { db } from "@/lib/db";
import { assertOwnership } from "@/lib/authz";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import {
  createJourneySchema,
  isPublishable,
  itinerarySchema,
  journeyBasicsSchema,
  journeyBudgetSchema,
  journeyContentSchema,
  journeyRouteSchema,
  type CreateJourneyInput,
  type ItineraryInput,
  type JourneyBasicsInput,
  type JourneyBudgetInput,
  type JourneyContentInput,
  type JourneyRouteInput,
} from "./journey.schema";
import { generateUniqueSlug } from "./journey.slug.server";
import {
  toCardDto,
  toDetailDto,
  toEditDto,
  type JourneyCardDto,
  type JourneyDetailDto,
  type JourneyEditDto,
} from "./journey.mappers";
import { deleteStoredImage, type StoredImage } from "./journey.storage";

const AUTHOR_SELECT = { name: true, handle: true, image: true, bio: true } as const;

const FULL_INCLUDE = {
  images: true,
  days: { include: { stops: true }, orderBy: { dayNumber: "asc" } },
  tags: { include: { tag: true } },
  author: { select: AUTHOR_SELECT },
} as const;

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Ownership guards
// ---------------------------------------------------------------------------

async function loadOwnedJourney(userId: string, journeyId: string) {
  const journey = await db.journey.findUnique({
    where: { id: journeyId },
    include: { author: { select: { handle: true } } },
  });
  if (!journey || journey.deletedAt) throw AppError.notFound("Journey not found");
  assertOwnership(userId, journey.authorId);
  return journey;
}

/** Slug + author handle — enough for a caller to revalidate the right paths. */
export interface JourneyRef {
  slug: string;
  authorHandle: string | null;
}

async function loadOwnedImage(userId: string, imageId: string) {
  const image = await db.journeyImage.findUnique({
    where: { id: imageId },
    include: {
      journey: {
        select: {
          id: true,
          authorId: true,
          slug: true,
          deletedAt: true,
          author: { select: { handle: true } },
        },
      },
    },
  });
  if (!image || image.journey.deletedAt) throw AppError.notFound("Image not found");
  assertOwnership(userId, image.journey.authorId);
  return image;
}

const refOf = (j: { slug: string; author: { handle: string | null } }): JourneyRef => ({
  slug: j.slug,
  authorHandle: j.author.handle,
});

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function createDraft(userId: string, input: CreateJourneyInput) {
  const { title, destinationName } = createJourneySchema.parse(input);
  const slug = await generateUniqueSlug(title);
  const journey = await db.journey.create({
    data: { authorId: userId, title, destinationName, slug, status: "DRAFT" },
    select: { id: true, slug: true },
  });
  logger.info({ userId, journeyId: journey.id }, "journey draft created");
  return journey;
}

/** Owner-only full view for the edit page. */
export async function getForEdit(userId: string, slug: string): Promise<JourneyEditDto> {
  const journey = await db.journey.findUnique({ where: { slug }, include: FULL_INCLUDE });
  if (!journey || journey.deletedAt) throw AppError.notFound("Journey not found");
  assertOwnership(userId, journey.authorId);
  return toEditDto(journey);
}

/** Public view. Drafts are visible only to their author. */
export async function getPublicJourney(
  slug: string,
  viewerId?: string,
): Promise<{ journey: JourneyDetailDto; isViewerAuthor: boolean } | null> {
  const journey = await db.journey.findUnique({ where: { slug }, include: FULL_INCLUDE });
  if (!journey || journey.deletedAt) return null;

  const isViewerAuthor = Boolean(viewerId) && journey.authorId === viewerId;
  if (journey.status !== "PUBLISHED" && !isViewerAuthor) return null;

  return { journey: toDetailDto(journey), isViewerAuthor };
}

/** Journeys authored by `authorId`. Drafts included only when the viewer is the author. */
export async function listByAuthor(
  authorId: string,
  opts: { viewerId?: string } = {},
): Promise<JourneyCardDto[]> {
  const isOwner = opts.viewerId === authorId;
  const journeys = await db.journey.findMany({
    where: { authorId, deletedAt: null, ...(isOwner ? {} : { status: "PUBLISHED" }) },
    include: { images: true, author: { select: AUTHOR_SELECT } },
    orderBy: [{ status: "asc" }, { publishedAt: "desc" }, { updatedAt: "desc" }],
  });
  return journeys.map(toCardDto);
}

/** Same as `listByAuthor`, keyed by the author's public handle. */
export async function listByAuthorHandle(
  handle: string,
  opts: { viewerId?: string } = {},
): Promise<JourneyCardDto[]> {
  const user = await db.user.findUnique({
    where: { handle: handle.toLowerCase() },
    select: { id: true },
  });
  return user ? listByAuthor(user.id, opts) : [];
}

/** Fire-and-forget view counter — only counts published journeys. */
export async function recordView(slug: string): Promise<void> {
  await db.journey
    .updateMany({
      where: { slug, status: "PUBLISHED", deletedAt: null },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Section updates
// ---------------------------------------------------------------------------

export async function updateBasics(
  userId: string,
  journeyId: string,
  input: JourneyBasicsInput,
): Promise<JourneyRef> {
  const journey = await loadOwnedJourney(userId, journeyId);
  const data = journeyBasicsSchema.parse(input);
  await db.journey.update({ where: { id: journeyId }, data });
  return refOf(journey);
}

export async function updateRoute(
  userId: string,
  journeyId: string,
  input: JourneyRouteInput,
): Promise<JourneyRef> {
  const journey = await loadOwnedJourney(userId, journeyId);
  const { startDate, endDate, durationDays } = journeyRouteSchema.parse(input);
  const derived =
    startDate && endDate
      ? Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1
      : (durationDays ?? null);
  await db.journey.update({
    where: { id: journeyId },
    data: { startDate: startDate ?? null, endDate: endDate ?? null, durationDays: derived },
  });
  return refOf(journey);
}

export async function updateBudget(
  userId: string,
  journeyId: string,
  input: JourneyBudgetInput,
): Promise<JourneyRef> {
  const journey = await loadOwnedJourney(userId, journeyId);
  const d = journeyBudgetSchema.parse(input);
  await db.journey.update({
    where: { id: journeyId },
    data: {
      budgetAmount: d.budgetAmount ?? null,
      budgetCurrency: d.budgetCurrency,
      transportModes: d.transportModes,
      travelStyle: d.travelStyle,
    },
  });
  return refOf(journey);
}

export async function updateContent(
  userId: string,
  journeyId: string,
  input: JourneyContentInput,
): Promise<JourneyRef> {
  const journey = await loadOwnedJourney(userId, journeyId);
  const d = journeyContentSchema.parse(input);
  await db.journey.update({
    where: { id: journeyId },
    data: { description: d.description, tips: d.tips },
  });
  return refOf(journey);
}

/**
 * Replace the whole itinerary in one transaction. Days and their stops are
 * deleted and recreated from the payload — simpler and always consistent
 * versus diffing, and an itinerary is small.
 */
export async function replaceItinerary(
  userId: string,
  journeyId: string,
  input: ItineraryInput,
): Promise<JourneyRef> {
  const journey = await loadOwnedJourney(userId, journeyId);
  const { days } = itinerarySchema.parse(input);

  await db.$transaction(async (tx) => {
    await tx.journeyDay.deleteMany({ where: { journeyId } });
    for (const [i, day] of days.entries()) {
      await tx.journeyDay.create({
        data: {
          journeyId,
          dayNumber: i + 1,
          title: day.title,
          date: day.date ?? null,
          notes: day.notes,
          stops: {
            create: day.stops.map((s, j) => ({
              position: j,
              time: s.time,
              type: s.type,
              title: s.title,
              description: s.description,
              locationName: s.locationName,
              cost: s.cost ?? null,
              costCurrency: s.costCurrency ?? null,
            })),
          },
        },
      });
    }
  });

  return refOf(journey);
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export async function addImage(
  userId: string,
  journeyId: string,
  stored: StoredImage,
  meta: { width?: number | null; height?: number | null } = {},
) {
  await loadOwnedJourney(userId, journeyId);
  const count = await db.journeyImage.count({ where: { journeyId } });
  return db.journeyImage.create({
    data: {
      journeyId,
      url: stored.url,
      storageKey: stored.storageKey,
      width: meta.width ?? null,
      height: meta.height ?? null,
      position: count,
      isCover: count === 0,
    },
  });
}

export async function updateImageCaption(
  userId: string,
  imageId: string,
  caption: string | null,
): Promise<JourneyRef> {
  const image = await loadOwnedImage(userId, imageId);
  await db.journeyImage.update({ where: { id: imageId }, data: { caption } });
  return refOf(image.journey);
}

export async function setCoverImage(userId: string, imageId: string): Promise<JourneyRef> {
  const image = await loadOwnedImage(userId, imageId);
  await db.$transaction([
    db.journeyImage.updateMany({
      where: { journeyId: image.journey.id, isCover: true },
      data: { isCover: false },
    }),
    db.journeyImage.update({ where: { id: imageId }, data: { isCover: true } }),
  ]);
  return refOf(image.journey);
}

export async function reorderImages(
  userId: string,
  journeyId: string,
  orderedIds: string[],
): Promise<JourneyRef> {
  const journey = await loadOwnedJourney(userId, journeyId);
  const owned = new Set(
    (await db.journeyImage.findMany({ where: { journeyId }, select: { id: true } })).map(
      (i) => i.id,
    ),
  );
  const clean = orderedIds.filter((id) => owned.has(id));
  await db.$transaction(
    clean.map((id, i) => db.journeyImage.update({ where: { id }, data: { position: i } })),
  );
  return refOf(journey);
}

export async function removeImage(userId: string, imageId: string): Promise<JourneyRef> {
  const image = await loadOwnedImage(userId, imageId);
  await db.journeyImage.delete({ where: { id: imageId } });
  await deleteStoredImage(image.storageKey);

  if (image.isCover) {
    const next = await db.journeyImage.findFirst({
      where: { journeyId: image.journey.id },
      orderBy: { position: "asc" },
    });
    if (next) await db.journeyImage.update({ where: { id: next.id }, data: { isCover: true } });
  }
  return refOf(image.journey);
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export async function publish(userId: string, journeyId: string): Promise<JourneyRef> {
  const journey = await loadOwnedJourney(userId, journeyId);
  if (!isPublishable(journey)) {
    throw AppError.badRequest("A few things are still needed before this can be published");
  }
  await db.journey.update({
    where: { id: journeyId },
    data: { status: "PUBLISHED", publishedAt: journey.publishedAt ?? new Date() },
  });
  logger.info({ userId, journeyId }, "journey published");
  return refOf(journey);
}

export async function unpublish(userId: string, journeyId: string): Promise<JourneyRef> {
  const journey = await loadOwnedJourney(userId, journeyId);
  await db.journey.update({ where: { id: journeyId }, data: { status: "DRAFT" } });
  return refOf(journey);
}

export async function remove(userId: string, journeyId: string): Promise<JourneyRef> {
  const journey = await loadOwnedJourney(userId, journeyId);
  await db.journey.update({
    where: { id: journeyId },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
  logger.info({ userId, journeyId }, "journey deleted");
  return refOf(journey);
}
