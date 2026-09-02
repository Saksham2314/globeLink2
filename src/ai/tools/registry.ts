import type { Tool, ToolKind } from "./define-tool";
import { getJourneyTool } from "./get-journey.tool";
import { searchJourneysTool } from "./search-journeys.tool";

/**
 * The tool allow-list. Phase 6 implements the two read tools; the rest are
 * specified here (name, kind, confirmation requirement) so their shape is
 * settled, and are implemented in Phases 7–8 as the agent loop and the
 * confirmation flow land. Nothing outside this map is callable.
 */

export const IMPLEMENTED_TOOLS = {
  searchJourneys: searchJourneysTool,
  getJourney: getJourneyTool,
} satisfies Record<string, Tool>;

export type ImplementedToolName = keyof typeof IMPLEMENTED_TOOLS;

export interface PlannedTool {
  name: string;
  kind: ToolKind;
  confirm: boolean;
  note: string;
}

/** Designed, not yet built. See docs/ARCHITECTURE.md §5.2 and docs/adr/0009. */
export const PLANNED_TOOLS: readonly PlannedTool[] = [
  { name: "getUserPreferences", kind: "read", confirm: false, note: "Reads TravelPreference." },
  { name: "getSavedJourneys", kind: "read", confirm: false, note: "The user's bookmarks." },
  { name: "getItineraryContext", kind: "read", confirm: false, note: "Signals from the user's own itineraries, owner-scoped." },
  { name: "saveJourney", kind: "mutate", confirm: false, note: "Low risk, reversible." },
  { name: "createItinerary", kind: "mutate", confirm: true, note: "Wraps itineraries service." },
  { name: "updateItinerary", kind: "mutate", confirm: true, note: "Wraps itineraries service." },
  { name: "sendMessage", kind: "mutate", confirm: true, note: "Always shows exact text first." },
] as const;

export function getTool(name: string): Tool | undefined {
  return (IMPLEMENTED_TOOLS as Record<string, Tool>)[name];
}

/**
 * Tools available for a given context. Phase 6 exposes every implemented (read)
 * tool; Phase 7/8 will filter by feature flags, role and confirmation support.
 */
export function availableTools(): Tool[] {
  return Object.values(IMPLEMENTED_TOOLS);
}
