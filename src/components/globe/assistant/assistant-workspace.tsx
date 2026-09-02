"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import { cn } from "@/lib/utils";
import type { AgentSessionDto } from "@/modules/agent/agent.mappers";

import { AssistantCanvas } from "./assistant-canvas";
import { AssistantComposer } from "./assistant-composer";
import { AssistantConversation } from "./assistant-conversation";
import { AssistantSessionList } from "./assistant-session-list";
import { latestToolResult } from "./parts";
import { composeWithReply, type QuotedReply } from "./reply";

interface Props {
  sessionId: string;
  sessionTitle: string;
  initialMessages: UIMessage[];
  sessions: AgentSessionDto[];
}

export function AssistantWorkspace({ sessionId, sessionTitle, initialMessages, sessions }: Props) {
  const { messages, sendMessage, status, stop, error, addToolResult } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/agent",
      prepareSendMessagesRequest: ({ messages, id }) => ({
        body: { sessionId: id, message: messages[messages.length - 1] },
      }),
    }),
  });

  const busy = status === "submitted" || status === "streaming";
  const [replyTo, setReplyTo] = useState<QuotedReply | null>(null);
  const [sheet, setSheet] = useState<null | "sessions" | "canvas">(null);
  const hasCanvas = latestToolResult(messages) != null;

  function send(text: string) {
    sendMessage({ text: composeWithReply(text, replyTo) });
    setReplyTo(null);
    setSheet(null);
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-4rem)] w-full max-w-7xl gap-4 px-3 py-3 sm:px-4 sm:py-4">
      <div className="hidden w-56 shrink-0 md:block">
        <AssistantSessionList sessions={sessions} activeId={sessionId} />
      </div>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="border-border mb-2 flex items-center gap-2 border-b pb-2">
          <button
            type="button"
            onClick={() => setSheet("sessions")}
            aria-label="Conversations"
            className="border-border-strong text-muted hover:text-ink flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors md:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <h1 className="font-display text-ink min-w-0 flex-1 truncate text-base sm:text-lg">
            {sessionTitle}
          </h1>
          {hasCanvas ? (
            <button
              type="button"
              onClick={() => setSheet("canvas")}
              className="border-border-strong text-muted hover:text-ink shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors lg:hidden"
            >
              Results
            </button>
          ) : null}
        </header>

        <AssistantConversation
          messages={messages}
          busy={busy}
          error={error}
          sessionId={sessionId}
          onReply={setReplyTo}
          onToolResolved={({ toolName, toolCallId, output }) =>
            addToolResult({ tool: toolName, toolCallId, output })
          }
        />

        <div className="pt-2">
          <AssistantComposer
            onSend={send}
            onStop={stop}
            busy={busy}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </div>
      </section>

      <div className="hidden w-[22rem] shrink-0 lg:block">
        <AssistantCanvas messages={messages} />
      </div>

      {sheet ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSheet(null)}
            className="bg-ink/40 absolute inset-0 backdrop-blur-sm"
          />
          <div
            className={cn(
              "bg-bg absolute inset-y-0 flex w-[86%] max-w-sm flex-col p-3 shadow-xl",
              sheet === "sessions" ? "left-0" : "right-0",
            )}
          >
            <div className="mb-1 flex justify-end">
              <button
                type="button"
                onClick={() => setSheet(null)}
                aria-label="Close"
                className="text-muted hover:text-ink size-8"
              >
                ✕
              </button>
            </div>
            {sheet === "sessions" ? (
              <AssistantSessionList sessions={sessions} activeId={sessionId} />
            ) : (
              <AssistantCanvas messages={messages} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
