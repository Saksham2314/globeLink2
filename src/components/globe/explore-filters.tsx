"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TRANSPORT_MODES, TRAVEL_STYLES } from "@/lib/travel-vocab";
import { cn } from "@/lib/utils";
import { SORTS } from "@/modules/search/search.schema";

const cap = (s: string) =>
  s === "roadtrip" ? "Road trip" : s.charAt(0).toUpperCase() + s.slice(1);

const SORT_LABELS: Record<string, string> = {
  relevance: "Best match",
  recent: "Most recent",
  budget: "Lowest budget",
  duration: "Shortest",
};

export function ExploreFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  // Text inputs are locally controlled; committed on submit.
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [destination, setDestination] = useState(sp.get("destination") ?? "");
  const [maxBudget, setMaxBudget] = useState(sp.get("maxBudget") ?? "");
  const [maxDays, setMaxDays] = useState(sp.get("maxDays") ?? "");

  const activeStyles = new Set((sp.get("styles") ?? "").split(",").filter(Boolean));
  const activeTransport = new Set((sp.get("transport") ?? "").split(",").filter(Boolean));

  function commit(next: Record<string, string | string[] | undefined>) {
    const params = new URLSearchParams(sp.toString());
    params.delete("cursor");
    for (const [key, value] of Object.entries(next)) {
      const v = Array.isArray(value) ? value.join(",") : value;
      if (v && v.length) params.set(key, v);
      else params.delete(key);
    }
    const qs = params.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function toggleIn(setKey: "styles" | "transport", set: Set<string>, value: string) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    commit({ [setKey]: [...next] });
  }

  const hasAny =
    q || destination || maxBudget || maxDays || activeStyles.size || activeTransport.size;

  return (
    <div className="border-border bg-surface space-y-4 rounded-lg border p-4" aria-busy={pending}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commit({ q, destination, maxBudget, maxDays });
        }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search journeys…"
          aria-label="Search text"
          className="lg:col-span-2"
        />
        <Input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Destination"
          aria-label="Destination"
        />
        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
            placeholder="Max budget"
            aria-label="Maximum budget"
          />
          <Input
            type="number"
            min={1}
            max={365}
            value={maxDays}
            onChange={(e) => setMaxDays(e.target.value)}
            placeholder="≤ days"
            aria-label="Maximum days"
            className="w-24"
          />
        </div>
        <button type="submit" className="hidden" aria-hidden />
      </form>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-muted text-xs font-semibold tracking-wide uppercase">Style</span>
        {TRAVEL_STYLES.map((s) => (
          <Chip
            key={s}
            active={activeStyles.has(s)}
            onClick={() => toggleIn("styles", activeStyles, s)}
          >
            {cap(s)}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-muted text-xs font-semibold tracking-wide uppercase">Transport</span>
        {TRANSPORT_MODES.map((t) => (
          <Chip
            key={t}
            active={activeTransport.has(t)}
            onClick={() => toggleIn("transport", activeTransport, t)}
          >
            {cap(t)}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <label className="text-muted flex items-center gap-2 text-sm">
          Sort
          <Select
            value={sp.get("sort") ?? "relevance"}
            onChange={(e) => commit({ sort: e.target.value })}
            className="h-9 w-40"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </Select>
        </label>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => commit({ q, destination, maxBudget, maxDays })}
            disabled={pending}
          >
            Apply
          </Button>
          {hasAny ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setQ("");
                setDestination("");
                setMaxBudget("");
                setMaxDays("");
                start(() => router.push(pathname, { scroll: false }));
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-accent bg-accent-soft text-ink"
          : "border-border-strong text-muted hover:bg-surface-muted",
      )}
    >
      {children}
    </button>
  );
}
