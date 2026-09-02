"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { interpretSearchAction } from "@/modules/search/search.actions";

/**
 * Plain-language search box for Explore. On submit it asks the server to
 * interpret the phrase into filter params, applies them to the URL (so the
 * filter chips below reflect the interpretation and stay editable), and shows
 * what was understood. Falls back to a normal text search for short queries,
 * on failure, or when AI is disabled.
 */
export function ExploreNlSearch({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function apply(params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function run() {
    const t = text.trim();
    if (!t) return;
    start(async () => {
      const res = await interpretSearchAction(t);
      setNote(res.interpreted ? res.note : null);
      apply(res.params);
    });
  }

  return (
    <div className="border-border bg-surface rounded-lg border p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="flex gap-2"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            enabled
              ? "Describe your trip — e.g. “4 days in Kyoto under ₹80k, relaxed”"
              : "Search journeys…"
          }
          aria-label="Describe your trip"
        />
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Reading…" : "Search"}
        </Button>
      </form>

      {note ? (
        <p className="text-muted mt-2 text-xs">
          Interpreted as <span className="text-ink font-medium">{note}</span>
          {" · "}
          <button
            type="button"
            className="text-accent hover:underline"
            onClick={() => {
              setNote(null);
              apply({ q: text.trim() });
            }}
          >
            search exact text instead
          </button>
        </p>
      ) : enabled ? (
        <p className="text-muted mt-2 text-xs">
          Plain-language search fills the filters below. Short queries just search the text.
        </p>
      ) : null}
    </div>
  );
}
