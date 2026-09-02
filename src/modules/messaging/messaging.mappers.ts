import type { Conversation, Journey, Message, User } from "@prisma/client";

export interface ParticipantDto {
  id: string;
  name: string | null;
  handle: string | null;
  image: string | null;
}

export function toParticipantDto(
  u: Pick<User, "id" | "name" | "handle" | "image">,
): ParticipantDto {
  return { id: u.id, name: u.name, handle: u.handle, image: u.image };
}

export interface MessageDto {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export function toMessageDto(m: Message): MessageDto {
  return {
    id: m.id,
    senderId: m.senderId,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  };
}

export interface ConversationSummaryDto {
  id: string;
  other: ParticipantDto;
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
  lastMessageAt: string;
  unreadCount: number;
  journey: { slug: string; title: string } | null;
}

type ConversationWithBits = Conversation & {
  participants: { user: Pick<User, "id" | "name" | "handle" | "image"> }[];
  messages: Message[];
  journey: Pick<Journey, "slug" | "title"> | null;
};

export function toConversationSummary(
  c: ConversationWithBits,
  viewerId: string,
  unreadCount: number,
): ConversationSummaryDto {
  const otherUser = c.participants.find((p) => p.user.id !== viewerId)?.user;
  const last = c.messages[0] ?? null;
  return {
    id: c.id,
    other: otherUser
      ? toParticipantDto(otherUser)
      : { id: "", name: "Unknown", handle: null, image: null },
    lastMessage: last
      ? { body: last.body, senderId: last.senderId, createdAt: last.createdAt.toISOString() }
      : null,
    lastMessageAt: c.lastMessageAt.toISOString(),
    unreadCount,
    journey: c.journey ? { slug: c.journey.slug, title: c.journey.title } : null,
  };
}
