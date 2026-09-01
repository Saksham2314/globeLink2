"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { STOP_TYPES } from "@/lib/travel-vocab";
import type { FormState } from "@/lib/forms";
import { saveItineraryAction } from "@/modules/journeys/journey.actions";
import type { JourneyEditDto } from "@/modules/journeys/journey.mappers";

type StopType = (typeof STOP_TYPES)[number];

interface StopDraft {
  key: string;
  time: string;
  type: StopType;
  title: string;
  description: string;
  locationName: string;
}

interface DayDraft {
  key: string;
  title: string;
  date: string;
  notes: string;
  stops: StopDraft[];
}

const uid = () => crypto.randomUUID();

const emptyStop = (): StopDraft => ({
  key: uid(),
  time: "",
  type: "ACTIVITY",
  title: "",
  description: "",
  locationName: "",
});

const emptyDay = (): DayDraft => ({ key: uid(), title: "", date: "", notes: "", stops: [] });

function fromDto(journey: JourneyEditDto): DayDraft[] {
  return journey.days.map((d) => ({
    key: uid(),
    title: d.title ?? "",
    date: d.date ? d.date.slice(0, 10) : "",
    notes: d.notes ?? "",
    stops: d.stops.map((s) => ({
      key: uid(),
      time: s.time ?? "",
      type: s.type as StopType,
      title: s.title,
      description: s.description ?? "",
      locationName: s.locationName ?? "",
    })),
  }));
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function ItineraryEditor({ journey }: { journey: JourneyEditDto }) {
  const [days, setDays] = useState<DayDraft[]>(() => fromDto(journey));
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  const patchDay = (i: number, patch: Partial<DayDraft>) =>
    setDays((d) => d.map((day, idx) => (idx === i ? { ...day, ...patch } : day)));

  const patchStop = (di: number, si: number, patch: Partial<StopDraft>) =>
    setDays((d) =>
      d.map((day, idx) =>
        idx === di
          ? { ...day, stops: day.stops.map((s, j) => (j === si ? { ...s, ...patch } : s)) }
          : day,
      ),
    );

  const save = () => {
    setState({});
    startTransition(async () => {
      const payload = {
        days: days.map((d) => ({
          title: d.title || undefined,
          date: d.date || undefined,
          notes: d.notes || undefined,
          stops: d.stops.map((s) => ({
            time: s.time || undefined,
            type: s.type,
            title: s.title,
            description: s.description || undefined,
            locationName: s.locationName || undefined,
          })),
        })),
      };
      setState(await saveItineraryAction(journey.id, payload));
    });
  };

  return (
    <div className="space-y-4">
      <FormMessage error={state.error} message={state.ok ? state.message : undefined} />

      {days.length === 0 ? (
        <p className="text-muted text-sm">No days yet. Add the first one below.</p>
      ) : null}

      {days.map((day, di) => (
        <div key={day.key} className="border-border bg-bg rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-accent text-sm">Day {di + 1}</span>
            <div className="flex gap-1">
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
              onChange={(ev) => patchDay(di, { title: ev.target.value })}
            />
            <Input
              type="date"
              value={day.date}
              onChange={(ev) => patchDay(di, { date: ev.target.value })}
            />
          </div>

          <div className="mt-3 space-y-3">
            {day.stops.map((stop, si) => (
              <div key={stop.key} className="border-border bg-surface rounded-md border p-3">
                <div className="flex items-start gap-2">
                  <div className="grid flex-1 gap-2 sm:grid-cols-[6rem_9rem_1fr]">
                    <Input
                      placeholder="Time"
                      value={stop.time}
                      onChange={(ev) => patchStop(di, si, { time: ev.target.value })}
                    />
                    <Select
                      value={stop.type}
                      onChange={(ev) => patchStop(di, si, { type: ev.target.value as StopType })}
                    >
                      {STOP_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t[0] + t.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </Select>
                    <Input
                      placeholder="What happened"
                      value={stop.title}
                      onChange={(ev) => patchStop(di, si, { title: ev.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <IconButton
                      label="Move up"
                      onClick={() => patchDay(di, { stops: move(day.stops, si, si - 1) })}
                    >
                      ↑
                    </IconButton>
                    <IconButton
                      label="Move down"
                      onClick={() => patchDay(di, { stops: move(day.stops, si, si + 1) })}
                    >
                      ↓
                    </IconButton>
                    <IconButton
                      label="Remove stop"
                      onClick={() => patchDay(di, { stops: day.stops.filter((_, j) => j !== si) })}
                    >
                      ✕
                    </IconButton>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Location (optional)"
                    value={stop.locationName}
                    onChange={(ev) => patchStop(di, si, { locationName: ev.target.value })}
                  />
                  <Input
                    placeholder="Note (optional)"
                    value={stop.description}
                    onChange={(ev) => patchStop(di, si, { description: ev.target.value })}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => patchDay(di, { stops: [...day.stops, emptyStop()] })}
              className="text-accent text-sm font-medium hover:underline"
            >
              + Add stop
            </button>
          </div>

          <Textarea
            className="mt-3"
            rows={2}
            placeholder="Notes for the day (optional)"
            value={day.notes}
            onChange={(ev) => patchDay(di, { notes: ev.target.value })}
          />
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onClick={() => setDays((d) => [...d, emptyDay()])}>
          + Add day
        </Button>
        <Button size="sm" onClick={save} disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : "Save itinerary"}
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
