import type { UIMessage } from "ai";

/** Narrow helpers over the AI SDK's `UIMessage` part union — kept in one place
 *  so the conversation and canvas agree on what a tool part looks like. */

type Part = UIMessage["parts"][number];

export interface TextPart {
  type: "text";
  text: string;
  state?: "streaming" | "done";
}

export type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error";

export interface ToolPart {
  type: string;
  toolCallId: string;
  state: ToolState;
  input?: unknown;
  output?: ToolOutput;
  errorText?: string;
  toolName?: string;
}

export type ToolOutput =
  { ok: true; data: unknown } | { ok: false; error: { code: string; message: string } };

export function isTextPart(p: Part): p is TextPart & Part {
  return p.type === "text" && typeof (p as { text?: unknown }).text === "string";
}

export function isToolPart(p: Part): p is ToolPart & Part {
  return typeof p.type === "string" && (p.type.startsWith("tool-") || p.type === "dynamic-tool");
}

export function toolNameOf(p: ToolPart): string {
  return p.type === "dynamic-tool" ? (p.toolName ?? "tool") : p.type.replace(/^tool-/, "");
}

/** Tools whose call the user must confirm before it runs. */
export const CONFIRM_TOOL_NAMES: ReadonlySet<string> = new Set([
  "createItinerary",
  "updateItinerary",
  "sendMessage",
]);

const CANVAS_TOOL_NAMES: ReadonlySet<string> = new Set(["searchJourneys", "getJourney"]);

// ---- Tool output shapes (mirror src/ai/tools/journey-shape.ts) -------------

export interface CanvasJourneyCard {
  slug: string;
  title: string;
  summary: string | null;
  destination: string | null;
  country: string | null;
  durationDays: number | null;
  budget: { amount: number; currency: string } | null;
}

export interface SearchToolData {
  count: number;
  hasMore: boolean;
  journeys: CanvasJourneyCard[];
}

export interface JourneyToolStop {
  time: string | null;
  type: string;
  title: string;
  location: string | null;
  cost: { amount: number; currency: string } | null;
}

export interface JourneyToolData {
  slug: string;
  title: string;
  summary: string | null;
  destination: string | null;
  country: string | null;
  durationDays: number | null;
  travelStyle: string[];
  budget: { amount: number; currency: string } | null;
  tips: string[];
  days: { dayNumber: number; title: string | null; stops: JourneyToolStop[] }[];
}

export interface SearchToolInput {
  query?: string;
  destination?: string;
  country?: string;
  maxBudget?: number;
  minDays?: number;
  maxDays?: number;
  styles?: string[];
  transport?: string[];
  sort?: string;
}

/** The most recent successful result from a canvas-renderable tool. */
export function latestToolResult(messages: UIMessage[]): ToolPart | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const parts = messages[i]?.parts ?? [];
    for (let j = parts.length - 1; j >= 0; j--) {
      const p = parts[j]!;
      if (
        isToolPart(p) &&
        p.state === "output-available" &&
        p.output?.ok &&
        CANVAS_TOOL_NAMES.has(toolNameOf(p))
      ) {
        return p;
      }
    }
  }
  return null;
}
