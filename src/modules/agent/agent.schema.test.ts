import { describe, expect, it } from "vitest";

import { agentRequestSchema, renameSessionSchema, userMessageText } from "./agent.schema";

const userMessage = {
  id: "m1",
  role: "user" as const,
  parts: [{ type: "text", text: "hi" }],
};

describe("agentRequestSchema", () => {
  it("accepts a well-formed request", () => {
    const r = agentRequestSchema.safeParse({ sessionId: "abc123", message: userMessage });
    expect(r.success).toBe(true);
  });

  it("requires a sessionId", () => {
    expect(agentRequestSchema.safeParse({ message: userMessage }).success).toBe(false);
  });

  it("rejects a non-user message role", () => {
    const r = agentRequestSchema.safeParse({
      sessionId: "abc",
      message: { ...userMessage, role: "assistant" },
    });
    expect(r.success).toBe(false);
  });

  it("rejects a message with no parts", () => {
    const r = agentRequestSchema.safeParse({
      sessionId: "abc",
      message: { ...userMessage, parts: [] },
    });
    expect(r.success).toBe(false);
  });

  it("keeps unknown part fields (passthrough)", () => {
    const r = agentRequestSchema.parse({
      sessionId: "abc",
      message: { ...userMessage, parts: [{ type: "text", text: "hi", state: "done" }] },
    });
    expect((r.message.parts[0] as { state?: string }).state).toBe("done");
  });
});

describe("renameSessionSchema", () => {
  it("trims and bounds the title", () => {
    expect(renameSessionSchema.safeParse({ id: "a", title: "  " }).success).toBe(false);
    expect(renameSessionSchema.safeParse({ id: "a", title: "Kyoto trip" }).success).toBe(true);
    expect(renameSessionSchema.safeParse({ id: "a", title: "x".repeat(200) }).success).toBe(false);
  });
});

describe("userMessageText", () => {
  it("joins text parts and ignores the rest", () => {
    expect(
      userMessageText([
        { type: "text", text: "four days" },
        { type: "tool-searchJourneys" },
        { type: "text", text: "in Kyoto" },
      ]),
    ).toBe("four days in Kyoto");
  });

  it("returns empty string when there is no text", () => {
    expect(userMessageText([{ type: "step-start" }])).toBe("");
  });
});
