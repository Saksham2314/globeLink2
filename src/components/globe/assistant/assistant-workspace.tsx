"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import type { AgentSessionDto } from "@/modules/agent/agent.mappers";

import { AssistantCanvas } from "./assistant-canvas";
import { AssistantComposer } from "./assistant-composer";
import { AssistantConversation } from "./assistant-conversation";
import { AssistantSessionList } from "./assistant-session-list";

interface Props {
  sessionId: string;
  sessionTitle: string;
  initialMessages: UIMessage[];
  sessions: AgentSessionDto[];
}

export function AssistantWorkspace({ sessionId, sessionTitle, initialMessages, sessions }: Props) {
  const { messages, sendMessage, status, stop, error } = useChat({
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

  return (
    <div className="mx-auto grid h-[calc(100dvh-4rem)] w-full max-w-7xl gap-4 px-4 py-4 md:grid-cols-[15rem_1fr] lg:grid-cols-[15rem_minmax(0,1fr)_22rem]">
      <AssistantSessionList sessions={sessions} activeId={sessionId} />

      <section className="flex min-h-0 flex-col">
        <header className="border-border mb-2 border-b pb-2">
          <h1 className="font-display text-ink truncate text-lg">{sessionTitle}</h1>
        </header>
        <AssistantConversation messages={messages} busy={busy} error={error} />
        <div className="pt-2">
          <AssistantComposer onSend={(text) => sendMessage({ text })} onStop={stop} busy={busy} />
        </div>
      </section>

      <AssistantCanvas messages={messages} />
    </div>
  );
}
