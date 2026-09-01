"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";

import { cn } from "@/lib/utils";
import { toggleSaveAction } from "@/modules/saved/saved.actions";

interface SaveButtonProps {
  journeyId: string;
  initialSaved?: boolean;
  /** Whether the viewer is signed in. */
  canSave: boolean;
  variant?: "icon" | "labelled";
  className?: string;
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[18px]"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M12 20s-7-4.35-9.5-8.5C1 8 2.5 4.5 6 4.5c2 0 3.3 1.2 4 2.3.7-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 7C19 15.65 12 20 12 20Z" />
    </svg>
  );
}

export function SaveButton({
  journeyId,
  initialSaved = false,
  canSave,
  variant = "icon",
  className,
}: SaveButtonProps) {
  const pathname = usePathname();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();

  const base =
    variant === "labelled"
      ? "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors"
      : "inline-flex size-9 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-colors";

  if (!canSave) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        aria-label="Sign in to save"
        className={cn(
          base,
          "border-border-strong bg-surface/90 text-muted hover:text-ink",
          className,
        )}
      >
        <Heart filled={false} />
        {variant === "labelled" ? "Save" : null}
      </Link>
    );
  }

  const toggle = () => {
    const next = !saved;
    setSaved(next);
    start(async () => {
      const res = await toggleSaveAction(journeyId);
      if (!res.ok) setSaved(!next);
      else if (typeof res.saved === "boolean") setSaved(res.saved);
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save journey"}
      className={cn(
        base,
        saved
          ? "border-heart/40 bg-heart-soft text-heart"
          : "border-border-strong bg-surface/90 text-muted hover:text-ink",
        className,
      )}
    >
      <Heart filled={saved} />
      {variant === "labelled" ? (saved ? "Saved" : "Save") : null}
    </button>
  );
}
