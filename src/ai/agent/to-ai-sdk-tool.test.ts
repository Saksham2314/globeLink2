import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/agent/agent-tool-call.service", () => ({
  recordAgentToolCall: vi.fn(),
}));

const { buildAgentTools } = await import("./to-ai-sdk-tool");

const READ_AND_INLINE = ["getJourney", "saveJourney", "searchJourneys"];
const CONFIRM = ["createItinerary", "sendMessage", "updateItinerary"];

describe("buildAgentTools", () => {
  const tools = buildAgentTools({ userId: "u1", sessionId: "s1" });

  it("exposes every implemented tool to the model", () => {
    expect(Object.keys(tools).sort()).toEqual([...READ_AND_INLINE, ...CONFIRM].sort());
  });

  it("every tool carries a description and an input schema", () => {
    for (const [name, t] of Object.entries(tools)) {
      expect(typeof t.description, name).toBe("string");
      expect(t.description!.length, name).toBeGreaterThan(20);
      expect(t.inputSchema, name).toBeDefined();
    }
  });

  it("read + inline tools get an execute; confirm tools do not (so the loop pauses)", () => {
    for (const name of READ_AND_INLINE) expect(typeof tools[name]!.execute, name).toBe("function");
    for (const name of CONFIRM) expect(tools[name]!.execute, name).toBeUndefined();
  });

  it("execute delegates to the registry tool's run() and returns its result contract", async () => {
    const registry = await import("@/ai/tools/registry");
    const spy = vi
      .spyOn(registry.IMPLEMENTED_TOOLS.searchJourneys, "run")
      .mockResolvedValue({ ok: true, data: { count: 0, hasMore: false, journeys: [] } });

    const rebuilt = buildAgentTools({ userId: "u1", sessionId: "s1" });
    const out = await rebuilt.searchJourneys!.execute!({ limit: 3 }, {} as never);

    expect(spy).toHaveBeenCalledWith({ limit: 3 }, { userId: "u1", sessionId: "s1" });
    expect(out).toEqual({ ok: true, data: { count: 0, hasMore: false, journeys: [] } });
    spy.mockRestore();
  });
});
