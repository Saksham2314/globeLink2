import "server-only";

import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { pairKey } from "./pair-key";
import { sendMessageSchema, type SendMessageInput } from "./messaging.schema";
import {
  toConversationSummary,
  toMessageDto,
  toParticipantDto,
  type ConversationSummaryDto,
  type MessageDto,
  type ParticipantDto,
} from "./messaging.mappers";

const PARTICIPANT_USER_SELECT = { id: true, name: true, handle: true, image: true } as const;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

/** Ensure the user is a member of the conversation. NOT_FOUND either way, so a
 *  non-member can't tell a conversation exists. */
async function assertParticipant(userId: string, conversationId: string): Promise<void> {
  const member = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { conversationId: true },
  });
  if (!member) throw AppError.notFound("Conversation not found");
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function getOrCreateConversation(
  userId: string,
  recipientId: string,
  opts: { journeyId?: string } = {},
): Promise<{ id: string }> {
  if (userId === recipientId) throw AppError.badRequest("You can't message yourself");

  const recipient = await db.user.findUnique({
    where: { id: recipientId },
    select: { id: true },
  });
  if (!recipient) throw AppError.notFound("That person doesn't exist");

  const key = pairKey(userId, recipientId);

  const existing = await db.conversation.findUnique({
    where: { pairKey: key },
    select: { id: true },
  });
  if (existing) return existing;

  try {
    return await db.conversation.create({
      data: {
        pairKey: key,
        journeyId: opts.journeyId ?? null,
        participants: { create: [{ userId }, { userId: recipientId }] },
      },
      select: { id: true },
    });
  } catch (error) {
    // Lost a create race — the row now exists.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await db.conversation.findUnique({
        where: { pairKey: key },
        select: { id: true },
      });
      if (raced) return raced;
    }
    throw error;
  }
}

export interface ConversationHeader {
  id: string;
  other: ParticipantDto;
  journey: { slug: string; title: string } | null;
}

export async function getConversationHeader(
  userId: string,
  conversationId: string,
): Promise<ConversationHeader> {
  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: { include: { user: { select: PARTICIPANT_USER_SELECT } } },
      journey: { select: { slug: true, title: true } },
    },
  });
  if (!convo || !convo.participants.some((p) => p.userId === userId)) {
    throw AppError.notFound("Conversation not found");
  }
  const other = convo.participants.find((p) => p.userId !== userId)?.user;
  return {
    id: convo.id,
    other: other ? toParticipantDto(other) : { id: "", name: "Unknown", handle: null, image: null },
    journey: convo.journey,
  };
}

export async function listConversations(
  userId: string,
  opts: { cursor?: string; limit?: number } = {},
): Promise<{ items: ConversationSummaryDto[]; nextCursor: string | null }> {
  const limit = clamp(opts.limit ?? 20, 1, 50);

  const rows = await db.conversation.findMany({
    where: { participants: { some: { userId } } },
    orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    include: {
      participants: { include: { user: { select: PARTICIPANT_USER_SELECT } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      journey: { select: { slug: true, title: true } },
    },
  });

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const ids = page.map((c) => c.id);

  const unread = await unreadCountsByConversation(userId, ids);
  const items = page.map((c) => toConversationSummary(c, userId, unread.get(c.id) ?? 0));
  const last = page[page.length - 1];

  return { items, nextCursor: hasMore && last ? last.id : null };
}

/** One grouped query for every conversation's unread count — no N+1. */
async function unreadCountsByConversation(
  userId: string,
  conversationIds: string[],
): Promise<Map<string, number>> {
  if (conversationIds.length === 0) return new Map();

  const rows = await db.$queryRaw<{ cid: string; n: number }[]>(Prisma.sql`
    SELECT m."conversationId" AS cid, COUNT(*)::int AS n
    FROM "messages" m
    JOIN "conversation_participants" p
      ON p."conversationId" = m."conversationId" AND p."userId" = ${userId}
    WHERE m."conversationId" = ANY(${conversationIds}::text[])
      AND m."senderId" <> ${userId}
      AND m."createdAt" > p."lastReadAt"
    GROUP BY m."conversationId"
  `);
  return new Map(rows.map((r) => [r.cid, r.n]));
}

export async function getTotalUnread(userId: string): Promise<number> {
  const rows = await db.$queryRaw<{ n: number }[]>(Prisma.sql`
    SELECT COUNT(*)::int AS n
    FROM "messages" m
    JOIN "conversation_participants" p
      ON p."conversationId" = m."conversationId" AND p."userId" = ${userId}
    WHERE m."senderId" <> ${userId}
      AND m."createdAt" > p."lastReadAt"
  `);
  return rows[0]?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** A page of messages, oldest → newest, plus a cursor for loading older ones. */
export async function listMessages(
  userId: string,
  conversationId: string,
  opts: { before?: string; limit?: number } = {},
): Promise<{ messages: MessageDto[]; olderCursor: string | null }> {
  await assertParticipant(userId, conversationId);
  const limit = clamp(opts.limit ?? 30, 1, 60);

  const rows = await db.message.findMany({
    where: { conversationId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(opts.before ? { cursor: { id: opts.before }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const olderCursor = hasMore && page.length ? page[page.length - 1]!.id : null;

  return { messages: page.reverse().map(toMessageDto), olderCursor };
}

/** Messages created after `afterMessageId` (exclusive), oldest → newest. Used by
 *  the polling route. */
export async function messagesSince(
  userId: string,
  conversationId: string,
  afterMessageId?: string,
): Promise<MessageDto[]> {
  await assertParticipant(userId, conversationId);

  let after: { createdAt: Date; id: string } | null = null;
  if (afterMessageId) {
    const anchor = await db.message.findFirst({
      where: { id: afterMessageId, conversationId },
      select: { createdAt: true, id: true },
    });
    after = anchor ?? null;
  }

  const rows = await db.message.findMany({
    where: {
      conversationId,
      ...(after
        ? {
            OR: [
              { createdAt: { gt: after.createdAt } },
              { AND: [{ createdAt: after.createdAt }, { id: { gt: after.id } }] },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 200,
  });
  return rows.map(toMessageDto);
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  input: SendMessageInput,
): Promise<MessageDto> {
  await assertParticipant(userId, conversationId);
  const { body } = sendMessageSchema.parse(input);

  const now = new Date();
  const [message] = await db.$transaction([
    db.message.create({ data: { conversationId, senderId: userId, body } }),
    db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
    db.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: now },
    }),
  ]);

  logger.info({ userId, conversationId }, "message sent");
  return toMessageDto(message);
}

export async function markRead(userId: string, conversationId: string): Promise<void> {
  await assertParticipant(userId, conversationId);
  await db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });
}
