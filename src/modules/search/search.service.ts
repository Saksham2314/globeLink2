import "server-only";

import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { CARD_INCLUDE } from "@/modules/journeys/journey.service";
import { toCardDto, type JourneyCardDto } from "@/modules/journeys/journey.mappers";

import { decodeCursor, encodeCursor } from "./search.cursor";
import type { SearchParams, SortKey } from "./search.schema";

export interface SearchResult {
  items: JourneyCardDto[];
  nextCursor: string | null;
}

/**
 * Discovery search over PUBLISHED journeys.
 *
 * A raw query ranks/filters and returns only ids + a keyset value; the full
 * rows are then loaded through Prisma so the normal `toCardDto` mapping (cover
 * image, author) still applies, in the exact ranked order.
 */
export async function searchJourneys(
  params: SearchParams,
  viewerId?: string,
): Promise<SearchResult> {
  const q = params.q;
  // "relevance" only means anything with a text query; otherwise → recent.
  const sort: SortKey = params.sort === "relevance" && !q ? "recent" : params.sort;

  const tsquery = q ? Prisma.sql`websearch_to_tsquery('english', ${q})` : null;

  const where: Prisma.Sql[] = [
    Prisma.sql`j."status" = 'PUBLISHED'`,
    Prisma.sql`j."deletedAt" IS NULL`,
  ];
  if (tsquery) where.push(Prisma.sql`j."searchVector" @@ ${tsquery}`);
  if (params.destination)
    where.push(Prisma.sql`j."destinationName" ILIKE ${`%${params.destination}%`}`);
  if (params.country) where.push(Prisma.sql`j."country" ILIKE ${`%${params.country}%`}`);
  if (params.maxBudget)
    where.push(
      Prisma.sql`j."budgetAmount" IS NOT NULL AND j."budgetAmount" <= ${params.maxBudget * 100}`,
    );
  if (params.minDays) where.push(Prisma.sql`j."durationDays" >= ${params.minDays}`);
  if (params.maxDays) where.push(Prisma.sql`j."durationDays" <= ${params.maxDays}`);
  if (params.styles.length) where.push(Prisma.sql`j."travelStyle" && ${params.styles}::text[]`);
  if (params.transport.length)
    where.push(Prisma.sql`j."transportModes" && ${params.transport}::text[]`);

  // One ascending numeric key per sort (smaller = earlier in results).
  const rankKey: Prisma.Sql =
    sort === "relevance" && tsquery
      ? Prisma.sql`(- ts_rank(j."searchVector", ${tsquery}))::float8`
      : sort === "budget"
        ? Prisma.sql`COALESCE(j."budgetAmount", 2147483647)::float8`
        : sort === "duration"
          ? Prisma.sql`COALESCE(j."durationDays", 2147483647)::float8`
          : Prisma.sql`(- EXTRACT(EPOCH FROM COALESCE(j."publishedAt", j."createdAt")))::float8`;

  const cursor = decodeCursor(params.cursor);
  if (cursor) {
    where.push(
      Prisma.sql`(${rankKey} > ${cursor.k} OR (${rankKey} = ${cursor.k} AND j."id" > ${cursor.i}))`,
    );
  }

  const rows = await db.$queryRaw<{ id: string; k: number }[]>(Prisma.sql`
    SELECT j."id" AS id, ${rankKey} AS k
    FROM "journeys" j
    WHERE ${Prisma.join(where, " AND ")}
    ORDER BY k ASC, j."id" ASC
    LIMIT ${params.limit + 1}
  `);

  const hasMore = rows.length > params.limit;
  const pageRows = rows.slice(0, params.limit);
  const ids = pageRows.map((r) => r.id);
  if (ids.length === 0) return { items: [], nextCursor: null };

  const journeys = await db.journey.findMany({ where: { id: { in: ids } }, include: CARD_INCLUDE });
  const byId = new Map(journeys.map((j) => [j.id, j]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((j): j is NonNullable<typeof j> => Boolean(j));

  const savedSet = viewerId ? await savedIdSet(viewerId, ids) : null;
  const items = ordered.map((j) => {
    const dto = toCardDto(j);
    return savedSet ? { ...dto, isSaved: savedSet.has(j.id) } : dto;
  });

  const last = pageRows[pageRows.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ k: last.k, i: last.id }) : null;
  return { items, nextCursor };
}

async function savedIdSet(userId: string, journeyIds: string[]): Promise<Set<string>> {
  const rows = await db.savedJourney.findMany({
    where: { userId, journeyId: { in: journeyIds } },
    select: { journeyId: true },
  });
  return new Set(rows.map((r) => r.journeyId));
}
