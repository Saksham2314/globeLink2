import { tool, type ToolSet } from "ai";

import type { ToolContext } from "@/ai/tools/context";
import { availableTools } from "@/ai/tools/registry";

/**
 * Adapt the tool registry to AI SDK tools for the loop.
 *
 * - Read tools and `saveJourney` get an `execute` that calls `tool.run` — which
 *   validates args, enforces authorization, writes the `AgentToolCall` (and, for
 *   `saveJourney`, the `AuditLog`) row, and normalizes the result.
 * - Confirm tools (`createItinerary`, `updateItinerary`, `sendMessage`) get NO
 *   `execute`, so the model's call lands as a pending tool part and the loop
 *   pauses. The `<ConfirmationCard>` renders it; the confirmation server action
 *   calls `tool.execute()` once the user approves.
 */
export function buildAgentTools(ctx: ToolContext): ToolSet {
  const set: ToolSet = {};
  for (const t of availableTools()) {
    const base = { description: t.description, inputSchema: t.inputSchema };
    set[t.name] =
      t.kind === "mutate" && t.confirm
        ? tool(base)
        : tool({ ...base, execute: (args: unknown) => t.run(args, ctx) });
  }
  return set;
}
