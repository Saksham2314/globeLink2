"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ConversationSummaryDto } from "@/modules/messaging/messaging.mappers";

export function ConversationList({ conversations }: { conversations: ConversationSummaryDto[] }) {
  const params = useParams<{ conversationId?: string }>();
  const activeId = params?.conversationId;

  if (conversations.length === 0) {
    return (
      <p className="text-muted p-4 text-sm">
        No conversations yet. Message a journey&rsquo;s author to start one.
      </p>
    );
  }

  return (
    <ul className="divide-border divide-y">
      {conversations.map((c) => {
        const name = c.other.name ?? (c.other.handle ? `@${c.other.handle}` : "A traveller");
        const preview = c.lastMessage
          ? `${c.lastMessage.senderId === c.other.id ? "" : "You: "}${c.lastMessage.body}`
          : "Say hello";
        const active = c.id === activeId;
        return (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}`}
              className={cn(
                "flex gap-3 px-3 py-3 transition-colors",
                active ? "bg-surface-muted" : "hover:bg-surface-muted/60",
              )}
            >
              <Avatar name={name} image={c.other.image} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-ink truncate text-sm font-medium">{name}</span>
                  <span className="text-muted shrink-0 text-xs">
                    {formatTimeAgo(c.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-muted truncate text-sm">{preview}</p>
                  {c.unreadCount > 0 ? (
                    <span className="bg-accent text-accent-contrast inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-medium">
                      {c.unreadCount > 99 ? "99+" : c.unreadCount}
                    </span>
                  ) : null}
                </div>
                {c.journey ? (
                  <p className="text-muted mt-0.5 truncate text-xs">re: {c.journey.title}</p>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  return (
    <span className="border-border-strong bg-surface-muted text-ink flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border text-sm">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        name.replace("@", "").charAt(0).toUpperCase() || "?"
      )}
    </span>
  );
}
