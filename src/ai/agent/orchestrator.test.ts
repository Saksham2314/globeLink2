import { describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";
import { convertArrayToReadableStream, MockLanguageModelV2 } from "ai/test";

vi.mock("@/modules/agent/agent-tool-call.service", () => ({
  recordAgentToolCall: vi.fn(),
}));

const textModel = (chunks: string[]) =>
  new MockLanguageModelV2({
    doStream: async () => ({
      stream: convertArrayToReadableStream([
        { type: "text-start", id: "1" },
        ...chunks.map((delta) => ({ type: "text-delta" as const, id: "1", delta })),
        { type: "text-end", id: "1" },
        {
          type: "finish" as const,
          finishReason: "stop" as const,
          usage: { inputTokens: 8, outputTokens: 4, totalTokens: 12 },
        },
      ]),
    }),
  });

let currentModel: MockLanguageModelV2;
vi.mock("../provider", () => ({
  getAgentModel: () => currentModel,
  getExtractionModel: () => currentModel,
  EXTRACTION_MODEL_ID: "mock",
  AGENT_MODEL_ID: "mock",
}));

const { streamAgentReply } = await import("./orchestrator");

const userTurn = (text: string): UIMessage[] => [
  { id: "u1", role: "user", parts: [{ type: "text", text }] },
];

describe("streamAgentReply", () => {
  it("streams the model's text reply", async () => {
    currentModel = textModel(["Two journeys ", "match that."]);
    const result = streamAgentReply({
      uiMessages: userTurn("cheap trips to Goa"),
      summary: null,
      ctx: { userId: "u1", sessionId: "s1" },
    });
    expect(await result.text).toBe("Two journeys match that.");
  });

  it("passes the system prompt and the windowed history to the model", async () => {
    currentModel = textModel(["ok"]);
    const result = streamAgentReply({
      uiMessages: userTurn("hello"),
      summary: "Earlier: user wants a beach trip.",
      ctx: { userId: "u1", sessionId: "s1" },
    });
    await result.consumeStream();
    const call = currentModel.doStreamCalls[0]!;
    const system = call.prompt.find((m) => m.role === "system");
    expect(JSON.stringify(system)).toContain("GlobeLink's travel assistant");
    expect(JSON.stringify(system)).toContain("beach trip");
    expect(call.prompt.some((m) => m.role === "user")).toBe(true);
  });

  it("produces a UI message stream Response", async () => {
    currentModel = textModel(["hi"]);
    const result = streamAgentReply({
      uiMessages: userTurn("hi"),
      summary: null,
      ctx: { userId: "u1", sessionId: "s1" },
    });
    const response = result.toUIMessageStreamResponse();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await response.text();
  });

  it("advertises the full tool set to the model", async () => {
    currentModel = textModel(["ok"]);
    const result = streamAgentReply({
      uiMessages: userTurn("hi"),
      summary: null,
      ctx: { userId: "u1", sessionId: "s1" },
    });
    await result.consumeStream();
    const names = (currentModel.doStreamCalls[0]!.tools ?? []).map((t) => t.name).sort();
    expect(names).toEqual([
      "createItinerary",
      "getJourney",
      "saveJourney",
      "searchJourneys",
      "sendMessage",
      "updateItinerary",
    ]);
  });
});
