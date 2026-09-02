"use client";

import { cn } from "@/lib/utils";

import { toolNameOf, type ToolPart } from "./parts";

const RUNNING_LABEL: Record<string, string> = {
  searchJourneys: "Searching journeys…",
  getJourney: "Reading the journey…",
};

function summarize(part: ToolPart): { text: string; tone: "run" | "done" | "err" } {
  const name = toolNameOf(part);

  if (part.state === "output-error") return { text: `${name} failed`, tone: "err" };

  if (part.state === "output-available") {
    const out = part.output;
    if (!out || out.ok === false) {
      return {
        text: out && !out.ok ? `${name}: ${out.error.message}` : `${name} failed`,
        tone: "err",
      };
    }
    const data = out.data as { count?: number; title?: string } | undefined;
    if (name === "searchJourneys") {
      const n = data?.count ?? 0;
      return { text: `Searched journeys · ${n} result${n === 1 ? "" : "s"}`, tone: "done" };
    }
    if (name === "getJourney") {
      return { text: `Opened “${data?.title ?? "journey"}”`, tone: "done" };
    }
    return { text: `Used ${name}`, tone: "done" };
  }

  return { text: RUNNING_LABEL[name] ?? `Running ${name}…`, tone: "run" };
}

export function ToolStatusChip({ part }: { part: ToolPart }) {
  const { text, tone } = summarize(part);

  return (
    <details className="group my-1.5 w-fit max-w-full">
      <summary
        className={cn(
          "border-border bg-surface text-muted inline-flex cursor-pointer list-none items-center gap-2 rounded-full border px-3 py-1 text-xs",
          tone === "err" && "border-danger/40 text-danger",
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            tone === "run" && "bg-accent animate-pulse",
            tone === "done" && "bg-success",
            tone === "err" && "bg-danger",
          )}
        />
        {text}
        <span className="text-muted/60 group-open:hidden">▸</span>
        <span className="text-muted/60 hidden group-open:inline">▾</span>
      </summary>
      <pre className="border-border bg-surface-muted text-muted mt-1.5 max-h-64 overflow-auto rounded-md border p-2 text-[11px] leading-relaxed">
        {JSON.stringify({ input: part.input ?? null, output: part.output ?? null }, null, 2)}
      </pre>
    </details>
  );
}
