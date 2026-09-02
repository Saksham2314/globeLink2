import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ConversationList } from "@/components/globe/conversation-list";
import { Container } from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { listConversations } from "@/modules/messaging/messaging.service";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/messages");

  const { items } = await listConversations(session.user.id);

  return (
    <Container className="py-10">
      <h1 className="font-display text-ink text-3xl">Messages</h1>

      {items.length === 0 ? (
        <div className="border-border mt-8 rounded-lg border border-dashed py-16 text-center">
          <p className="text-ink text-sm font-medium">No conversations yet.</p>
          <p className="text-muted mt-1 text-sm">
            Open a journey and hit <span className="text-ink">Message</span> to reach its author.
          </p>
          <Link
            href="/explore"
            className="text-accent mt-4 inline-block text-sm font-medium hover:underline"
          >
            Explore journeys
          </Link>
        </div>
      ) : (
        <div className="border-border bg-surface mt-6 max-w-xl overflow-hidden rounded-lg border">
          <ConversationList conversations={items} />
        </div>
      )}
    </Container>
  );
}
