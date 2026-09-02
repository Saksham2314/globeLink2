"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";

import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";

import { isTextPart, isToolPart } from "./parts";
import { ToolStatusChip } from "./tool-status-chip";

interface Props {
  messages: UIMessage[];
  busy: boolean;
  error?: Error;
}

export function AssistantConversation({ messages, busy, error }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  const lastRole = messages[messages.length - 1]?.role;
  const showThinking = busy && lastRole === "user";

  return (
    <div className="flex-1 space-y-5 overflow-y-auto px-1 py-4">
      {messages.length === 0 ? (
        <p className="text-muted mx-auto max-w-md pt-10 text-center text-sm">
          Ask about places to go, budgets, trip length, or a style of travel. The assistant searches
          journeys other travellers have published.
        </p>
      ) : null}

      {messages.map((message) => {
        const parts = message.parts ?? [];
        const isUser = message.role === "user";
        return (
          <div key={message.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] space-y-1.5", isUser && "flex flex-col items-end")}>
              {parts.map((part, i) => {
                if (isTextPart(part)) {
                  return part.text.trim() ? (
                    <div
                      key={i}
                      className={cn(
                        isUser
                          ? "bg-accent text-accent-contrast rounded-2xl rounded-br-sm px-3.5 py-2 text-sm"
                          : "text-ink",
                      )}
                    >
                      {isUser ? part.text : <Markdown>{part.text}</Markdown>}
                    </div>
                  ) : null;
                }
                if (isToolPart(part)) {
                  return <ToolStatusChip key={i} part={part} />;
                }
                return null;
              })}
            </div>
          </div>
        );
      })}

      {showThinking ? (
        <div className="text-muted flex items-center gap-2 text-sm">
          <span className="bg-accent size-1.5 animate-pulse rounded-full" />
          Thinking…
        </div>
      ) : null}

      {error ? (
        <p className="border-danger/40 bg-danger-soft text-danger rounded-md border px-3 py-2 text-sm">
          {error.message || "Something went wrong. Try again."}
        </p>
      ) : null}

      <div ref={endRef} />
    </div>
  );
}
