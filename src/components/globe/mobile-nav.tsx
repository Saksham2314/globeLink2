"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  signedIn: boolean;
  unread: number;
  className?: string;
}

/** Compact menu for the header below `md`. Mirrors the desktop nav links plus
 *  the primary actions, so nothing is unreachable on a phone. */
export function MobileNav({ signedIn, unread, className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-haspopup="menu"
        className="border-border-strong bg-surface text-ink hover:bg-surface-muted focus-visible:ring-accent focus-visible:ring-offset-bg flex size-9 items-center justify-center rounded-md border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>

      <div
        className={cn(
          "border-border bg-surface absolute top-full right-0 z-50 mt-2 w-56 origin-top-right rounded-lg border p-1.5 shadow-lg transition",
          open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0",
        )}
      >
        <MobileLink href="/explore" onNav={close}>
          Explore
        </MobileLink>
        {signedIn ? (
          <>
            <MobileLink href="/assistant" onNav={close}>
              Assistant
            </MobileLink>
            <MobileLink href="/messages" onNav={close}>
              <span className="flex items-center gap-2">
                Messages
                {unread > 0 ? (
                  <span className="bg-accent text-accent-contrast inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </span>
            </MobileLink>
            <MobileLink href="/itineraries" onNav={close}>
              Itineraries
            </MobileLink>
            <div className="bg-border my-1 h-px" />
            <MobileLink href="/journeys/new" onNav={close}>
              Create a journey
            </MobileLink>
          </>
        ) : (
          <>
            <div className="bg-border my-1 h-px" />
            <MobileLink href="/login" onNav={close}>
              Sign in
            </MobileLink>
            <div className="p-1.5">
              <Button asChild size="sm" className="w-full" onClick={close}>
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MobileLink({
  href,
  onNav,
  children,
}: {
  href: string;
  onNav: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNav}
      className="text-ink hover:bg-surface-muted block rounded-md px-2.5 py-2 text-sm transition-colors"
    >
      {children}
    </Link>
  );
}
