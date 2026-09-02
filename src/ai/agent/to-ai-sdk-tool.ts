import { tool, type ToolSet } from "ai";

import type { ToolContext } from "@/ai/tools/context";
import { availableTools } from "@/ai/tools/registry";

/**
 * Adapt the Phase 6 tool registry to AI SDK tools for the loop. Each `execute`
 * just calls `tool.run`, which already validates args, enforces authorization,
 * writes the `AgentToolCall` row, and normalizes to `{ok,data}|{ok,error}` — so
 * the model sees our contract and can recover from a failure on its own.
 */
export function buildAgentTools(ctx: ToolContext): ToolSet {
  const set: ToolSet = {};
  for (const t of availableTools()) {
    set[t.name] = tool({
      description: t.description,
      inputSchema: t.inputSchema,
      execute: (args: unknown) => t.run(args, ctx),
    });
  }
  return set;
}
