"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ThemeControl } from "@/components/globe/theme-control";
import { signOutAction } from "@/modules/auth/auth.actions";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  name: string | null;
  handle: string | null;
  image: string | null;
}

export function UserMenu({ name, handle, image }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="border-border-strong bg-surface text-ink hover:bg-surface-muted focus-visible:ring-accent focus-visible:ring-offset-bg flex size-9 items-center justify-center overflow-hidden rounded-full border text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="size-full object-cover" />
        ) : (
          initial
        )}
      </button>

      <div
        role="menu"
        className={cn(
          "border-border bg-surface absolute right-0 mt-2 w-60 origin-top-right rounded-lg border p-1.5 shadow-lg transition",
          open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0",
        )}
      >
        <div className="px-2.5 py-2">
          <p className="text-ink truncate text-sm font-medium">{name ?? "Your account"}</p>
          {handle ? <p className="text-muted truncate text-xs">@{handle}</p> : null}
        </div>
        <div className="bg-border my-1 h-px" />
        {handle ? (
          <MenuLink href={`/profile/${handle}`} onNavigate={() => setOpen(false)}>
            View profile
          </MenuLink>
        ) : null}
        <MenuLink href="/messages" onNavigate={() => setOpen(false)}>
          Messages
        </MenuLink>
        <MenuLink href="/saved" onNavigate={() => setOpen(false)}>
          Saved journeys
        </MenuLink>
        <MenuLink href="/settings" onNavigate={() => setOpen(false)}>
          Settings
        </MenuLink>

        <div className="bg-border my-1 h-px" />
        <ThemeControl />
        <div className="bg-border my-1 h-px" />

        <form action={signOutAction}>
          <button
            type="submit"
            role="menuitem"
            className="text-ink hover:bg-surface-muted w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="text-ink hover:bg-surface-muted block rounded-md px-2.5 py-2 text-sm transition-colors"
    >
      {children}
    </Link>
  );
}
