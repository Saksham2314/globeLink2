"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  busy: boolean;
  disabled?: boolean;
}

export function AssistantComposer({ onSend, onStop, busy, disabled }: Props) {
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
      className="border-border bg-surface flex items-end gap-2 rounded-lg border p-2"
    >
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
        placeholder="Ask about journeys, budgets, trip length…"
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
    </form>
  );
}
