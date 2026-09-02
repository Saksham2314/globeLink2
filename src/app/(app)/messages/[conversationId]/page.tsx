import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ConversationList } from "@/components/globe/conversation-list";
import { MessageThread } from "@/components/globe/message-thread";
import { Container } from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { requireVerifiedUser } from "@/lib/require-verified";
import { isAppError } from "@/lib/errors";
import {
  getConversationHeader,
  listConversations,
  listMessages,
} from "@/modules/messaging/messaging.service";

export const metadata: Metadata = { title: "Conversation" };

type Params = { params: Promise<{ conversationId: string }> };

export default async function ConversationPage({ params }: Params) {
  const { conversationId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?next=/messages/${conversationId}`);
  await requireVerifiedUser(`/messages/${conversationId}`);
  const userId = session.user.id;

  let header;
  try {
    header = await getConversationHeader(userId, conversationId);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const [{ messages, olderCursor }, conversations] = await Promise.all([
    listMessages(userId, conversationId),
    listConversations(userId),
  ]);

  return (
    <Container className="py-6">
      <div className="border-border bg-surface grid h-[calc(100dvh-8.5rem)] overflow-hidden rounded-lg border lg:grid-cols-[300px_1fr]">
        <aside className="border-border hidden overflow-y-auto border-r lg:block">
          <ConversationList conversations={conversations.items} />
        </aside>
        <MessageThread
          conversationId={conversationId}
          currentUserId={userId}
          other={header.other}
          journey={header.journey}
          initialMessages={messages}
          initialOlderCursor={olderCursor}
        />
      </div>
    </Container>
  );
}
