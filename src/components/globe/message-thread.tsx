"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";

import { FormMessage } from "@/components/ui/field";
import { formatClock, formatDayLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  loadOlderMessagesAction,
  markReadAction,
  sendMessageAction,
  type SendMessageState,
} from "@/modules/messaging/messaging.actions";
import type { MessageDto, ParticipantDto } from "@/modules/messaging/messaging.mappers";

const POLL_MS = 4000;

interface Props {
  conversationId: string;
  currentUserId: string;
  other: ParticipantDto;
  journey: { slug: string; title: string } | null;
  initialMessages: MessageDto[];
  initialOlderCursor: string | null;
}

function merge(existing: MessageDto[], incoming: MessageDto[]): MessageDto[] {
  if (incoming.length === 0) return existing;
  const seen = new Set(existing.map((m) => m.id));
  const added = incoming.filter((m) => !seen.has(m.id));
  return added.length ? [...existing, ...added] : existing;
}

export function MessageThread({
  conversationId,
  currentUserId,
  other,
  journey,
  initialMessages,
  initialOlderCursor,
}: Props) {
  const [messages, setMessages] = useState<MessageDto[]>(initialMessages);
  const [olderCursor, setOlderCursor] = useState(initialOlderCursor);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const otherName = other.name ?? (other.handle ? `@${other.handle}` : "A traveller");

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const touchRead = useCallback(() => {
    void markReadAction(conversationId);
  }, [conversationId]);

  // Initial position + mark read.
  useEffect(() => {
    scrollToBottom();
    touchRead();
  }, [scrollToBottom, touchRead]);

  // Poll for new messages while the tab is visible.
  useEffect(() => {
    let cancelled = false;

    async function pull() {
      if (document.visibilityState !== "visible") return;
      const last = messagesRef.current.at(-1)?.id;
      try {
        const res = await fetch(`/api/messages/${conversationId}${last ? `?after=${last}` : ""}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data: { messages: MessageDto[] } = await res.json();
        if (data.messages.length === 0) return;
        setMessages((prev) => merge(prev, data.messages));
        if (nearBottomRef.current) scrollToBottom("smooth");
        touchRead();
      } catch {
        // transient network error — next tick tries again
      }
    }

    const id = setInterval(pull, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void pull();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [conversationId, scrollToBottom, touchRead]);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  async function loadOlder() {
    if (!olderCursor || loadingOlder) return;
    setLoadingOlder(true);
    const el = scrollerRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const res = await loadOlderMessagesAction(conversationId, olderCursor);
      setMessages((prev) => [...res.messages, ...prev]);
      setOlderCursor(res.olderCursor);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    } finally {
      setLoadingOlder(false);
    }
  }

  // Composer
  const [state, action, pending] = useActionState<SendMessageState, FormData>(
    sendMessageAction.bind(null, conversationId),
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.ok && state.sentMessage) {
      const sent = state.sentMessage;
      setMessages((prev) => merge(prev, [sent]));
      if (inputRef.current) inputRef.current.value = "";
      nearBottomRef.current = true;
      scrollToBottom("smooth");
    }
  }, [state, scrollToBottom]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  let lastDay = "";

  return (
    <div className="flex h-full flex-col">
      <header className="border-border flex items-center gap-3 border-b px-4 py-3">
        <Link href="/messages" className="text-muted hover:text-ink lg:hidden" aria-label="Back">
          ←
        </Link>
        <span className="border-border-strong bg-surface-muted text-ink flex size-9 items-center justify-center overflow-hidden rounded-full border text-sm">
          {other.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={other.image} alt="" className="size-full object-cover" />
          ) : (
            otherName.replace("@", "").charAt(0).toUpperCase() || "?"
          )}
        </span>
        <div className="min-w-0">
          {other.handle ? (
            <Link
              href={`/profile/${other.handle}`}
              className="text-ink block truncate text-sm font-medium hover:underline"
            >
              {otherName}
            </Link>
          ) : (
            <span className="text-ink block truncate text-sm font-medium">{otherName}</span>
          )}
          {journey ? (
            <Link
              href={`/journeys/${journey.slug}`}
              className="text-muted block truncate text-xs hover:underline"
            >
              re: {journey.title}
            </Link>
          ) : null}
        </div>
      </header>

      <div ref={scrollerRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-4">
        {olderCursor ? (
          <div className="mb-4 text-center">
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingOlder}
              className="text-muted hover:text-ink text-xs font-medium disabled:opacity-60"
            >
              {loadingOlder ? "Loading…" : "Load earlier messages"}
            </button>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <p className="text-muted py-10 text-center text-sm">
            No messages yet. Send the first one.
          </p>
        ) : null}

        <ul className="space-y-1.5">
          {messages.map((m) => {
            const day = formatDayLabel(m.createdAt);
            const showDay = day !== lastDay;
            lastDay = day;
            const mine = m.senderId === currentUserId;
            return (
              <li key={m.id}>
                {showDay ? <div className="text-muted my-4 text-center text-xs">{day}</div> : null}
                <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap",
                      mine
                        ? "bg-accent text-accent-contrast rounded-br-sm"
                        : "bg-surface-muted text-ink rounded-bl-sm",
                    )}
                  >
                    {m.body}
                    <span
                      className={cn(
                        "mt-1 block text-[10px]",
                        mine ? "text-accent-contrast/70" : "text-muted",
                      )}
                    >
                      {formatClock(m.createdAt)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={bottomRef} />
      </div>

      <form
        ref={formRef}
        action={action}
        className="border-border flex items-end gap-2 border-t p-3"
      >
        <textarea
          ref={inputRef}
          name="body"
          rows={1}
          required
          maxLength={4000}
          onKeyDown={onKeyDown}
          placeholder={`Message ${otherName}`}
          className="border-border-strong bg-surface text-ink placeholder:text-muted/70 focus-visible:ring-accent focus-visible:ring-offset-bg max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-md border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-accent text-accent-contrast hover:bg-accent-hover h-10 shrink-0 rounded-md px-4 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {pending ? "…" : "Send"}
        </button>
      </form>
      {state.error || state.fieldErrors?.body ? (
        <div className="px-3 pb-2">
          <FormMessage error={state.error ?? state.fieldErrors?.body} />
        </div>
      ) : null}
    </div>
  );
}
