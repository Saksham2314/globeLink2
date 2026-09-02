"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useFocusTrap } from "@/hooks/use-focus-trap";
import { setThemePreference, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { quickNavTargetsAction, saveThemePreferenceAction } from "@/modules/users/user.actions";

/** Fired by the header button; also opens on ⌘K / Ctrl+K. */
export const OPEN_COMMAND_PALETTE_EVENT = "gl:command-palette";

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string;
  run: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<{
    journeys: { slug: string; title: string }[];
    itineraries: { id: string; title: string }[];
  }>({ journeys: [], itineraries: [] });
  const loadedRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  useFocusTrap(dialogRef, open, close);

  // Open triggers: ⌘K / Ctrl+K, and the custom event from the header button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onEvent);
    };
  }, []);

  // Lazy-load recent targets the first time the palette opens.
  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    void quickNavTargetsAction().then(setRecent);
  }, [open]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const pickTheme = useCallback((pref: ThemePreference) => {
    setThemePreference(pref);
    void saveThemePreferenceAction(pref);
  }, []);

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = [
      { id: "nav-explore", group: "Go to", label: "Explore journeys", run: () => go("/explore") },
      { id: "nav-saved", group: "Go to", label: "Saved journeys", run: () => go("/saved") },
      { id: "nav-itin", group: "Go to", label: "Itineraries", run: () => go("/itineraries") },
      { id: "nav-msg", group: "Go to", label: "Messages", run: () => go("/messages") },
      { id: "nav-assistant", group: "Go to", label: "Assistant", run: () => go("/assistant") },
      { id: "nav-settings", group: "Go to", label: "Settings", run: () => go("/settings") },
    ];
    const actions: Command[] = [
      {
        id: "act-new-journey",
        group: "Create",
        label: "New journey",
        run: () => go("/journeys/new"),
      },
      {
        id: "act-new-itin",
        group: "Create",
        label: "New itinerary",
        run: () => go("/itineraries/new"),
      },
    ];
    const theme: Command[] = (["light", "dark", "system"] as ThemePreference[]).map((p) => ({
      id: `theme-${p}`,
      group: "Theme",
      label: `Use ${p} theme`,
      keywords: "appearance dark light mode",
      run: () => {
        pickTheme(p);
        close();
      },
    }));
    const recentJourneys: Command[] = recent.journeys.map((j) => ({
      id: `j-${j.slug}`,
      group: "Recent journeys",
      label: j.title,
      keywords: "journey open edit",
      run: () => go(`/journeys/${j.slug}`),
    }));
    const recentItineraries: Command[] = recent.itineraries.map((it) => ({
      id: `i-${it.id}`,
      group: "Recent itineraries",
      label: it.title,
      keywords: "itinerary open edit",
      run: () => go(`/itineraries/${it.id}`),
    }));
    return [...nav, ...actions, ...theme, ...recentJourneys, ...recentItineraries];
  }, [recent, go, pickTheme, close]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? commands.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q))
      : commands;
    if (q) {
      base.push({
        id: "search-explore",
        group: "Search",
        label: `Search journeys for “${query.trim()}”`,
        run: () => go(`/explore?q=${encodeURIComponent(query.trim())}`),
      });
    }
    return base;
  }, [commands, query, go]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({
      block: "nearest",
    });
  }, [active]);

  if (!open) return null;

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[active]?.run();
    }
  };

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 p-4 pt-[12vh] motion-reduce:transition-none"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="border-border bg-surface w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl"
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onListKeyDown}
          placeholder="Search or jump to…"
          aria-label="Search commands"
          className="text-ink placeholder:text-muted w-full border-b border-[var(--color-border)] bg-transparent px-4 py-3.5 text-sm outline-none"
        />
        <ul ref={listRef} className="max-h-[50vh] overflow-y-auto py-1.5" role="listbox">
          {results.length === 0 ? (
            <li className="text-muted px-4 py-6 text-center text-sm">No matches.</li>
          ) : (
            results.map((c, i) => {
              const header = c.group !== lastGroup ? c.group : null;
              lastGroup = c.group;
              return (
                <li key={c.id}>
                  {header ? (
                    <p className="text-muted px-4 pt-2.5 pb-1 text-[11px] font-medium tracking-wide uppercase">
                      {header}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    data-idx={i}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => c.run()}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm",
                      i === active ? "bg-surface-muted text-ink" : "text-ink/90",
                    )}
                  >
                    <span className="truncate">{c.label}</span>
                    {c.hint ? <span className="text-muted shrink-0 text-xs">{c.hint}</span> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
