"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/format";
import type { FormState } from "@/lib/forms";
import { STOP_TYPES } from "@/lib/travel-vocab";
import { savePlanAction } from "@/modules/itineraries/itinerary.actions";
import type { ItineraryEditDto } from "@/modules/itineraries/itinerary.mappers";

type StopType = (typeof STOP_TYPES)[number];

interface ItemDraft {
  key: string;
  time: string;
  type: StopType;
  title: string;
  description: string;
  locationName: string;
  cost: string;
}

interface DayDraft {
  key: string;
  title: string;
  date: string;
  notes: string;
  items: ItemDraft[];
}

const uid = () => crypto.randomUUID();

const emptyItem = (): ItemDraft => ({
  key: uid(),
  time: "",
  type: "ACTIVITY",
  title: "",
  description: "",
  locationName: "",
  cost: "",
});

const emptyDay = (): DayDraft => ({ key: uid(), title: "", date: "", notes: "", items: [] });

function fromDto(dto: ItineraryEditDto): DayDraft[] {
  return dto.days.map((d) => ({
    key: uid(),
    title: d.title ?? "",
    date: d.date ? d.date.slice(0, 10) : "",
    notes: d.notes ?? "",
    items: d.items.map((i) => ({
      key: uid(),
      time: i.time ?? "",
      type: i.type as StopType,
      title: i.title,
      description: i.description ?? "",
      locationName: i.locationName ?? "",
      cost: i.cost != null ? String(i.cost / 100) : "",
    })),
  }));
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it!);
  return next;
}

const parseCost = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function PlanEditor({ itinerary }: { itinerary: ItineraryEditDto }) {
  const [days, setDays] = useState<DayDraft[]>(() => fromDto(itinerary));
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();

  const currency = itinerary.currency;

  const totals = useMemo(() => {
    const perDay = days.map((d) => d.items.reduce((sum, it) => sum + parseCost(it.cost), 0));
    return { perDay, grand: perDay.reduce((a, b) => a + b, 0) };
  }, [days]);

  const patchDay = (di: number, patch: Partial<DayDraft>) =>
    setDays((d) => d.map((day, i) => (i === di ? { ...day, ...patch } : day)));

  const patchItem = (di: number, ii: number, patch: Partial<ItemDraft>) =>
    setDays((d) =>
      d.map((day, i) =>
        i === di
          ? { ...day, items: day.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) }
          : day,
      ),
    );

  const save = () => {
    setState({});
    start(async () => {
      const payload = {
        days: days.map((d) => ({
          title: d.title.trim() || null,
          date: d.date || null,
          notes: d.notes.trim() || null,
          items: d.items.map((it) => ({
            time: it.time.trim() || null,
            type: it.type,
            title: it.title.trim(),
            description: it.description.trim() || null,
            locationName: it.locationName.trim() || null,
            cost: it.cost.trim() || null,
          })),
        })),
      };
      setState(await savePlanAction(itinerary.id, payload));
    });
  };

  return (
    <div className="space-y-4">
      <div className="border-border bg-surface flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-muted text-xs font-semibold tracking-wide uppercase">
            Estimated total
          </p>
          <p className="font-display text-ink text-xl">
            {formatMoney(Math.round(totals.grand * 100), currency) ?? `0 ${currency}`}
          </p>
        </div>
        <Button size="sm" onClick={save} disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : "Save plan"}
        </Button>
      </div>

      <FormMessage error={state.error} message={state.ok ? state.message : undefined} />

      {days.length === 0 ? (
        <p className="text-muted text-sm">No days yet. Add the first one below.</p>
      ) : null}

      {days.map((day, di) => (
        <div key={day.key} className="border-border bg-bg rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-accent text-sm">Day {di + 1}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted text-xs">
                {formatMoney(Math.round(totals.perDay[di]! * 100), currency)}
              </span>
              <IconButton label="Move up" onClick={() => setDays((d) => move(d, di, di - 1))}>
                ↑
              </IconButton>
              <IconButton label="Move down" onClick={() => setDays((d) => move(d, di, di + 1))}>
                ↓
              </IconButton>
              <IconButton
                label="Remove day"
                onClick={() => setDays((d) => d.filter((_, i) => i !== di))}
              >
                ✕
              </IconButton>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_10rem]">
            <Input
              placeholder="Day title (optional)"
              value={day.title}
              onChange={(e) => patchDay(di, { title: e.target.value })}
            />
            <Input
              type="date"
              value={day.date}
              onChange={(e) => patchDay(di, { date: e.target.value })}
            />
          </div>

          <div className="mt-3 space-y-3">
            {day.items.map((item, ii) => (
              <div key={item.key} className="border-border bg-surface rounded-md border p-3">
                <div className="flex items-start gap-2">
                  <div className="grid flex-1 gap-2 sm:grid-cols-[6rem_9rem_1fr_8rem]">
                    <Input
                      placeholder="Time"
                      value={item.time}
                      onChange={(e) => patchItem(di, ii, { time: e.target.value })}
                    />
                    <Select
                      value={item.type}
                      onChange={(e) => patchItem(di, ii, { type: e.target.value as StopType })}
                    >
                      {STOP_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t[0] + t.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </Select>
                    <Input
                      placeholder="What's planned"
                      value={item.title}
                      onChange={(e) => patchItem(di, ii, { title: e.target.value })}
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder={`Cost (${currency})`}
                      value={item.cost}
                      onChange={(e) => patchItem(di, ii, { cost: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <IconButton
                      label="Move up"
                      onClick={() => patchDay(di, { items: move(day.items, ii, ii - 1) })}
                    >
                      ↑
                    </IconButton>
                    <IconButton
                      label="Move down"
                      onClick={() => patchDay(di, { items: move(day.items, ii, ii + 1) })}
                    >
                      ↓
                    </IconButton>
                    <IconButton
                      label="Remove item"
                      onClick={() => patchDay(di, { items: day.items.filter((_, j) => j !== ii) })}
                    >
                      ✕
                    </IconButton>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Location (optional)"
                    value={item.locationName}
                    onChange={(e) => patchItem(di, ii, { locationName: e.target.value })}
                  />
                  <Input
                    placeholder="Note (optional)"
                    value={item.description}
                    onChange={(e) => patchItem(di, ii, { description: e.target.value })}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => patchDay(di, { items: [...day.items, emptyItem()] })}
              className="text-accent text-sm font-medium hover:underline"
            >
              + Add item
            </button>
          </div>

          <Textarea
            className="mt-3"
            rows={2}
            placeholder="Notes for the day (optional)"
            value={day.notes}
            onChange={(e) => patchDay(di, { notes: e.target.value })}
          />
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onClick={() => setDays((d) => [...d, emptyDay()])}>
          + Add day
        </Button>
        <Button size="sm" onClick={save} disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : "Save plan"}
        </Button>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="border-border text-muted hover:bg-surface-muted hover:text-ink flex size-7 items-center justify-center rounded border text-xs transition-colors"
    >
      {children}
    </button>
  );
}
