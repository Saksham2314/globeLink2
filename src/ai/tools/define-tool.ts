import "server-only";

import type { ZodError, ZodType } from "zod";

import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { recordAgentToolCall } from "@/modules/agent/agent-tool-call.service";

import type { ToolContext } from "./context";
import { type ToolResult, toolFail, toolOk } from "./result";

export type ToolKind = "read" | "mutate";

export interface ToolDefinition<TInput, TOutput> {
  name: string;
  /** Model-facing description: what it does, its units, and whether it changes data. */
  description: string;
  /** Zod schema — becomes the model's JSON Schema and the runtime arg guard.
   *  Use `.strict()` on objects so unknown keys are rejected. */
  input: ZodType<TInput>;
  kind: ToolKind;
  /** Mutating tools that require explicit user confirmation. In the agent loop
   *  these are registered *without* an `execute`, so the model's call pauses;
   *  the confirmation server action then calls `tool.execute()`. */
  confirm?: boolean;
  handler: (args: TInput, ctx: ToolContext) => Promise<TOutput>;
}

export interface Tool<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly kind: ToolKind;
  readonly confirm: boolean;
  readonly inputSchema: ZodType<TInput>;
  /** Validate args → confirmation gate (mutate+confirm returns NEEDS_CONFIRMATION
   *  without running) → execute. Used by the agent loop and direct callers. */
  run(rawArgs: unknown, ctx: ToolContext): Promise<ToolResult<TOutput>>;
  /** Validate args → execute, skipping the confirmation gate. The caller is
   *  responsible for having obtained confirmation. Never throws. */
  execute(rawArgs: unknown, ctx: ToolContext): Promise<ToolResult<TOutput>>;
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
  const confirm = def.confirm ?? false;

  async function perform(
    args: TInput,
    rawForLog: unknown,
    ctx: ToolContext,
    started: number,
  ): Promise<ToolResult<TOutput>> {
    try {
      const data = await def.handler(args, ctx);
      await recordAgentToolCall({
        userId: ctx.userId,
        sessionId: ctx.sessionId ?? null,
        toolName: def.name,
        args: rawForLog,
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
      if (!app || !app.expose) logger.error({ err, tool: def.name }, "tool handler threw");
      const result = toolFail(code, message);
      await recordAgentToolCall({
        userId: ctx.userId,
        sessionId: ctx.sessionId ?? null,
        toolName: def.name,
        args: rawForLog,
        result,
        status: app?.code === "FORBIDDEN" ? "DENIED" : "ERROR",
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      });
      return result;
    }
  }

  async function validate(
    rawArgs: unknown,
    ctx: ToolContext,
    started: number,
  ): Promise<{ ok: true; args: TInput } | { ok: false; result: ToolResult<TOutput> }> {
    const parsed = def.input.safeParse(rawArgs);
    if (parsed.success) return { ok: true, args: parsed.data };

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
    return { ok: false, result };
  }

  return {
    name: def.name,
    description: def.description,
    kind: def.kind,
    confirm,
    inputSchema: def.input,

    async run(rawArgs, ctx) {
      const started = Date.now();
      const checked = await validate(rawArgs, ctx, started);
      if (!checked.ok) return checked.result;

      if (def.kind === "mutate" && confirm) {
        const result = toolFail(
          "NEEDS_CONFIRMATION",
          `"${def.name}" needs the user to confirm it before it runs.`,
        );
        await recordAgentToolCall({
          userId: ctx.userId,
          sessionId: ctx.sessionId ?? null,
          toolName: def.name,
          args: checked.args,
          result,
          status: "AWAITING_CONFIRMATION",
          latencyMs: Date.now() - started,
          error: null,
        });
        return result;
      }

      return perform(checked.args, checked.args, ctx, started);
    },

    async execute(rawArgs, ctx) {
      const started = Date.now();
      const checked = await validate(rawArgs, ctx, started);
      if (!checked.ok) return checked.result;
      return perform(checked.args, checked.args, ctx, started);
    },
  };
}
