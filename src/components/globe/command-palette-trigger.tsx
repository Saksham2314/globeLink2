"use client";

import { useEffect, useState } from "react";

import { OPEN_COMMAND_PALETTE_EVENT } from "@/components/globe/command-palette";
import { cn } from "@/lib/utils";

/** Header affordance for the ⌘K palette. Shows the platform-correct shortcut. */
export function CommandPaletteTrigger({ className }: { className?: string }) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent));
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))}
      aria-label="Open command palette"
      aria-keyshortcuts="Meta+K Control+K"
      className={cn(
        "border-border-strong bg-surface text-muted hover:bg-surface-muted hover:text-ink focus-visible:ring-accent focus-visible:ring-offset-bg inline-flex h-9 items-center gap-2 rounded-md border px-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <kbd className="border-border bg-bg rounded border px-1.5 py-0.5 font-sans text-[11px]">
        {isMac ? "⌘" : "Ctrl"} K
      </kbd>
    </button>
  );
}
