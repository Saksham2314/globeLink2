import { createItineraryTool } from "./create-itinerary.tool";
import type { Tool, ToolKind } from "./define-tool";
import { getJourneyTool } from "./get-journey.tool";
import { saveJourneyTool } from "./save-journey.tool";
import { searchJourneysTool } from "./search-journeys.tool";
import { sendMessageTool } from "./send-message.tool";
import { updateItineraryTool } from "./update-itinerary.tool";

/**
 * The tool allow-list. Nothing outside this map is callable by the agent.
 * Read tools and `saveJourney` run inline in the loop; the confirm tools
 * (`createItinerary`, `updateItinerary`, `sendMessage`) are exposed to the
 * model without an `execute`, so the call pauses for user confirmation and the
 * confirmation server action then invokes `tool.execute()`.
 */

export const IMPLEMENTED_TOOLS = {
  searchJourneys: searchJourneysTool,
  getJourney: getJourneyTool,
  saveJourney: saveJourneyTool,
  createItinerary: createItineraryTool,
  updateItinerary: updateItineraryTool,
  sendMessage: sendMessageTool,
} satisfies Record<string, Tool>;

export type ImplementedToolName = keyof typeof IMPLEMENTED_TOOLS;

/** The names whose calls must be confirmed by the user before they run. */
export const CONFIRM_TOOLS: ReadonlySet<string> = new Set(
  Object.values(IMPLEMENTED_TOOLS)
    .filter((t) => t.kind === "mutate" && t.confirm)
    .map((t) => t.name),
);

export interface PlannedTool {
  name: string;
  kind: ToolKind;
  confirm: boolean;
  note: string;
}

/** Designed, not yet built. See docs/ARCHITECTURE.md §5.2. */
export const PLANNED_TOOLS: readonly PlannedTool[] = [
  { name: "getUserPreferences", kind: "read", confirm: false, note: "Reads TravelPreference." },
  { name: "getSavedJourneys", kind: "read", confirm: false, note: "The user's bookmarks." },
  {
    name: "getItineraryContext",
    kind: "read",
    confirm: false,
    note: "Signals from the user's own itineraries.",
  },
] as const;

export function getTool(name: string): Tool | undefined {
  return (IMPLEMENTED_TOOLS as Record<string, Tool>)[name];
}

/**
 * Tools available for a given context. Every implemented tool is exposed; the
 * loop-time adapter decides which get an `execute` (see `buildAgentTools`).
 */
export function availableTools(): Tool[] {
  return Object.values(IMPLEMENTED_TOOLS);
}
