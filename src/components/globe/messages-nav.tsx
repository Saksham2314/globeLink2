"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const REFRESH_MS = 25000;

/** "Messages" header link with a live unread badge (polled). */
export function MessagesNav({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/messages/unread", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: { count: number } = await res.json();
        setCount(data.count);
      } catch {
        // ignore
      }
    }

    const id = setInterval(refresh, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    void refresh();
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <Link
      href="/messages"
      className="text-muted hover:text-ink relative text-sm font-medium transition-colors"
    >
      Messages
      {count > 0 ? (
        <span className="bg-accent text-accent-contrast absolute -top-2 -right-3 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
