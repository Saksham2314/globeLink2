import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AppError } from "@/lib/errors";

const recordAgentToolCall = vi.fn();
vi.mock("@/modules/agent/agent-tool-call.service", () => ({
  recordAgentToolCall: (...args: unknown[]) => recordAgentToolCall(...args),
}));

const { defineTool } = await import("./define-tool");

const ctx = { userId: "user_1" as string | null };

/** The record written for the most recent (here, only) tool run. */
function loggedCall(): Record<string, unknown> {
  const arg = recordAgentToolCall.mock.calls[0]?.[0];
  if (!arg) throw new Error("recordAgentToolCall was not called");
  return arg as Record<string, unknown>;
}

beforeEach(() => recordAgentToolCall.mockClear());

const doubler = defineTool({
  name: "doubler",
  description: "doubles n",
  kind: "read",
  input: z.object({ n: z.number().int() }).strict(),
  handler: async ({ n }) => ({ doubled: n * 2 }),
});

describe("defineTool — arg validation", () => {
  it("runs the handler and returns ok on valid args", async () => {
    const res = await doubler.run({ n: 3 }, ctx);
    expect(res).toEqual({ ok: true, data: { doubled: 6 } });
    expect(recordAgentToolCall).toHaveBeenCalledTimes(1);
    expect(loggedCall()).toMatchObject({
      toolName: "doubler",
      status: "OK",
      userId: "user_1",
    });
  });

  it("rejects unknown keys (strict schema)", async () => {
    const res = await doubler.run({ n: 3, sneaky: true }, ctx);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("BAD_ARGS");
    expect(loggedCall()).toMatchObject({ status: "ERROR" });
  });

  it("rejects wrong types", async () => {
    const res = await doubler.run({ n: "nope" }, ctx);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("BAD_ARGS");
  });
});

describe("defineTool — error normalization", () => {
  it("maps an exposed AppError to its code, FORBIDDEN logs as DENIED", async () => {
    const tool = defineTool({
      name: "forbidden-tool",
      description: "always forbidden",
      kind: "read",
      input: z.object({}).strict(),
      handler: async () => {
        throw AppError.forbidden("nope");
      },
    });
    const res = await tool.run({}, ctx);
    expect(res).toEqual({ ok: false, error: { code: "FORBIDDEN", message: "nope" } });
    expect(loggedCall()).toMatchObject({ status: "DENIED" });
  });

  it("masks an unexpected error", async () => {
    const tool = defineTool({
      name: "boom",
      description: "throws",
      kind: "read",
      input: z.object({}).strict(),
      handler: async () => {
        throw new Error("internal detail");
      },
    });
    const res = await tool.run({}, ctx);
    expect(res).toEqual({
      ok: false,
      error: { code: "INTERNAL", message: "The tool could not complete." },
    });
    expect(loggedCall()).toMatchObject({ status: "ERROR" });
  });
});

describe("defineTool — mutate + confirm", () => {
  it("refuses to execute without a confirmation step (Phase 6)", async () => {
    const handler = vi.fn();
    const tool = defineTool({
      name: "danger",
      description: "mutates",
      kind: "mutate",
      confirm: true,
      input: z.object({}).strict(),
      handler,
    });
    const res = await tool.run({}, ctx);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("NEEDS_CONFIRMATION");
    expect(handler).not.toHaveBeenCalled();
    expect(loggedCall()).toMatchObject({ status: "AWAITING_CONFIRMATION" });
  });
});
