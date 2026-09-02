import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/agent/agent-tool-call.service", () => ({
  recordAgentToolCall: vi.fn(),
}));

const { buildAgentTools } = await import("./to-ai-sdk-tool");

describe("buildAgentTools", () => {
  const tools = buildAgentTools({ userId: "u1", sessionId: "s1" });

  it("exposes exactly the implemented read tools", () => {
    expect(Object.keys(tools).sort()).toEqual(["getJourney", "searchJourneys"]);
  });

  it("each tool carries a description and an input schema for the model", () => {
    for (const [name, t] of Object.entries(tools)) {
      expect(typeof t.description, name).toBe("string");
      expect(t.description!.length, name).toBeGreaterThan(20);
      expect(t.inputSchema, name).toBeDefined();
      expect(typeof t.execute, name).toBe("function");
    }
  });

  it("execute delegates to the registry tool's run() and returns its result contract", async () => {
    const registry = await import("@/ai/tools/registry");
    const spy = vi
      .spyOn(registry.IMPLEMENTED_TOOLS.searchJourneys, "run")
      .mockResolvedValue({ ok: true, data: { count: 0, hasMore: false, journeys: [] } });

    const rebuilt = buildAgentTools({ userId: "u1", sessionId: "s1" });
    const searchTool = rebuilt.searchJourneys!;
    const out = await searchTool.execute!({ limit: 3 }, {} as never);

    expect(spy).toHaveBeenCalledWith({ limit: 3 }, { userId: "u1", sessionId: "s1" });
    expect(out).toEqual({ ok: true, data: { count: 0, hasMore: false, journeys: [] } });
    spy.mockRestore();
  });
});
