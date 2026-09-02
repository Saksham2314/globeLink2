"use client";

import Link from "next/link";
import type { UIMessage } from "ai";

import { formatMoney } from "@/lib/format";

import {
  latestToolResult,
  toolNameOf,
  type CanvasJourneyCard,
  type JourneyToolData,
  type SearchToolData,
  type SearchToolInput,
} from "./parts";

const money = (b: { amount: number; currency: string } | null) =>
  b ? formatMoney(Math.round(b.amount * 100), b.currency) : null;

const place = (dest: string | null, country: string | null) =>
  [dest, country].filter(Boolean).join(", ") || "Destination unknown";

export function AssistantCanvas({ messages }: { messages: UIMessage[] }) {
  const part = latestToolResult(messages);

  let body: React.ReactNode = null;
  if (part && part.output?.ok) {
    const name = toolNameOf(part);
    if (name === "searchJourneys") {
      body = (
        <SearchResults
          input={part.input as SearchToolInput}
          data={part.output.data as SearchToolData}
        />
      );
    } else if (name === "getJourney") {
      body = <JourneyPreview data={part.output.data as JourneyToolData} />;
    }
  }

  return (
    <aside className="border-border bg-bg flex h-full min-h-0 flex-col overflow-y-auto rounded-lg border p-4">
      <p className="text-muted text-xs font-semibold tracking-[0.14em] uppercase">Canvas</p>
      {body ?? (
        <p className="text-muted mt-6 text-sm">
          Journeys the assistant finds appear here — cards you can open in a new tab.
        </p>
      )}
    </aside>
  );
}

function SearchResults({ input, data }: { input: SearchToolInput; data: SearchToolData }) {
  const chips = [
    input.query,
    input.destination,
    input.country,
    input.maxBudget ? `≤ ${formatMoney(input.maxBudget * 100, "INR")}` : null,
    input.maxDays ? `≤ ${input.maxDays} days` : null,
    input.minDays ? `≥ ${input.minDays} days` : null,
    ...(input.styles ?? []),
    ...(input.transport ?? []),
  ].filter(Boolean) as string[];

  return (
    <div className="mt-3 space-y-3">
      {chips.length ? (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className="border-border bg-surface-muted text-muted rounded-full border px-2 py-0.5 text-xs"
            >
              {c}
            </span>
          ))}
        </div>
      ) : null}

      <p className="text-muted text-xs">
        {data.count} result{data.count === 1 ? "" : "s"}
        {data.hasMore ? " (more available)" : ""}
      </p>

      {data.journeys.map((j) => (
        <CanvasCard key={j.slug} journey={j} />
      ))}
    </div>
  );
}

function CanvasCard({ journey }: { journey: CanvasJourneyCard }) {
  return (
    <div className="border-border bg-surface rounded-lg border p-3">
      <p className="text-muted text-[11px] font-semibold tracking-wide uppercase">
        {place(journey.destination, journey.country)}
      </p>
      <h4 className="font-display text-ink mt-1 text-sm leading-snug">{journey.title}</h4>
      <div className="text-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {journey.durationDays ? <span>{journey.durationDays} days</span> : null}
        {money(journey.budget) ? (
          <span className="text-ink font-medium">{money(journey.budget)}</span>
        ) : null}
      </div>
      <Link
        href={`/journeys/${journey.slug}`}
        target="_blank"
        rel="noreferrer"
        className="text-accent mt-2 inline-block text-xs font-medium hover:underline"
      >
        Open journey →
      </Link>
    </div>
  );
}

function JourneyPreview({ data }: { data: JourneyToolData }) {
  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="text-muted text-[11px] font-semibold tracking-wide uppercase">
          {place(data.destination, data.country)}
        </p>
        <h3 className="font-display text-ink mt-1 text-lg leading-snug">{data.title}</h3>
        <div className="text-muted mt-1 flex flex-wrap items-center gap-x-3 text-xs">
          {data.durationDays ? <span>{data.durationDays} days</span> : null}
          {money(data.budget) ? (
            <span className="text-ink font-medium">{money(data.budget)}</span>
          ) : null}
        </div>
      </div>

      {data.days.length ? (
        <ol className="space-y-2">
          {data.days.map((d) => (
            <li key={d.dayNumber} className="border-border bg-surface rounded-md border p-2.5">
              <p className="text-accent font-display text-xs">
                Day {d.dayNumber}
                {d.title ? ` · ${d.title}` : ""}
              </p>
              <ul className="text-muted mt-1 space-y-0.5 text-xs">
                {d.stops.map((s, i) => (
                  <li key={i}>
                    {s.title}
                    {s.location ? ` — ${s.location}` : ""}
                    {money(s.cost) ? ` · ${money(s.cost)}` : ""}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : null}

      {data.tips.length ? (
        <div>
          <p className="text-ink text-xs font-semibold">Tips</p>
          <ul className="text-muted mt-1 space-y-0.5 text-xs">
            {data.tips.slice(0, 6).map((t, i) => (
              <li key={i}>→ {t}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link
        href={`/journeys/${data.slug}`}
        target="_blank"
        rel="noreferrer"
        className="text-accent inline-block text-xs font-medium hover:underline"
      >
        Open full journey →
      </Link>
    </div>
  );
}
