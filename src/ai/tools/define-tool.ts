import "server-only";

import type { ZodType, ZodError } from "zod";

import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { recordAgentToolCall } from "@/modules/agent/agent-tool-call.service";

import type { ToolContext } from "./context";
import { type ToolResult, toolFail, toolOk } from "./result";

export type ToolKind = "read" | "mutate";

export interface ToolDefinition<TInput, TOutput> {
  name: string;
  /** Model-facing description: what it does, its units, that it is read-only. */
  description: string;
  /** Zod schema — becomes the model's JSON Schema and the runtime arg guard.
   *  Use `.strict()` on objects so unknown keys are rejected. */
  input: ZodType<TInput>;
  kind: ToolKind;
  /** Mutating tools that require explicit user approval. Designed now; the
   *  confirmation-token flow itself lands in Phase 8. */
  confirm?: boolean;
  handler: (args: TInput, ctx: ToolContext) => Promise<TOutput>;
}

export interface Tool<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly kind: ToolKind;
  readonly confirm: boolean;
  readonly inputSchema: ZodType<TInput>;
  /** Validate args, authorize, run the handler, log the call, return the
   *  normalized result. Never throws. */
  run(rawArgs: unknown, ctx: ToolContext): Promise<ToolResult<TOutput>>;
}

function firstIssue(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "invalid arguments";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

export function defineTool<TInput, TOutput>(
  def: ToolDefinition<TInput, TOutput>,
): Tool<TInput, TOutput> {
  return {
    name: def.name,
    description: def.description,
    kind: def.kind,
    confirm: def.confirm ?? false,
    inputSchema: def.input,

    async run(rawArgs, ctx) {
      const started = Date.now();

      const parsed = def.input.safeParse(rawArgs);
      if (!parsed.success) {
        const result = toolFail("BAD_ARGS", firstIssue(parsed.error));
        await recordAgentToolCall({
          userId: ctx.userId,
          sessionId: ctx.sessionId ?? null,
          toolName: def.name,
          args: rawArgs,
          result,
          status: "ERROR",
          latencyMs: Date.now() - started,
          error: result.error.message,
        });
        return result;
      }

      // Phase 6 has no confirmation-token plumbing. A mutate+confirm tool is
      // registered so its schema is designed, but must not execute yet.
      if (def.kind === "mutate" && (def.confirm ?? false)) {
        const result = toolFail(
          "NEEDS_CONFIRMATION",
          `"${def.name}" needs an explicit confirmation step that isn't available yet.`,
        );
        await recordAgentToolCall({
          userId: ctx.userId,
          sessionId: ctx.sessionId ?? null,
          toolName: def.name,
          args: parsed.data,
          result,
          status: "AWAITING_CONFIRMATION",
          latencyMs: Date.now() - started,
          error: null,
        });
        return result;
      }

      try {
        const data = await def.handler(parsed.data, ctx);
        await recordAgentToolCall({
          userId: ctx.userId,
          sessionId: ctx.sessionId ?? null,
          toolName: def.name,
          args: parsed.data,
          result: { ok: true },
          status: "OK",
          latencyMs: Date.now() - started,
          error: null,
        });
        return toolOk(data);
      } catch (err) {
        const app = isAppError(err) ? err : null;
        const code = app?.code ?? "INTERNAL";
        const message = app?.expose ? app.message : "The tool could not complete.";
        if (!app || !app.expose) {
          logger.error({ err, tool: def.name }, "tool handler threw");
        }
        const result = toolFail(code, message);
        await recordAgentToolCall({
          userId: ctx.userId,
          sessionId: ctx.sessionId ?? null,
          toolName: def.name,
          args: parsed.data,
          result,
          status: app?.code === "FORBIDDEN" ? "DENIED" : "ERROR",
          latencyMs: Date.now() - started,
          error: err instanceof Error ? err.message : String(err),
        });
        return result;
      }
    },
  };
}
