"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { QuotedReply } from "./reply";

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  busy: boolean;
  disabled?: boolean;
  replyTo: QuotedReply | null;
  onCancelReply: () => void;
}

export function AssistantComposer({
  onSend,
  onStop,
  busy,
  disabled,
  replyTo,
  onCancelReply,
}: Props) {
  const [text, setText] = useState("");

  function submit() {
    const value = text.trim();
    if (!value || busy || disabled) return;
    onSend(value);
    setText("");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="border-border bg-surface rounded-lg border p-2"
    >
      {replyTo ? (
        <div className="text-muted border-accent/60 mb-2 flex items-start gap-2 border-l-2 pl-2 text-xs">
          <span className="min-w-0 flex-1">
            <span className="text-ink font-medium">
              Replying to {replyTo.role === "user" ? "you" : "the assistant"}:{" "}
            </span>
            <span className="line-clamp-2">{replyTo.text}</span>
          </span>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            className="hover:text-ink shrink-0"
          >
            ✕
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          disabled={disabled}
          placeholder={replyTo ? "Reply…" : "Ask about journeys, budgets, trip length…"}
          aria-label="Message the assistant"
          className="text-ink placeholder:text-muted/70 max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm focus:outline-none disabled:opacity-60"
        />
        {busy ? (
          <Button type="button" variant="secondary" size="sm" onClick={onStop}>
            Stop
          </Button>
        ) : (
          <Button type="submit" size="sm" disabled={!text.trim() || disabled}>
            Send
          </Button>
        )}
      </div>
    </form>
  );
}
