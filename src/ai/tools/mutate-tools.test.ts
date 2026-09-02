import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/agent/agent-tool-call.service", () => ({ recordAgentToolCall: vi.fn() }));

const { saveJourneyTool } = await import("./save-journey.tool");
const { createItineraryTool } = await import("./create-itinerary.tool");
const { updateItineraryTool } = await import("./update-itinerary.tool");
const { sendMessageTool } = await import("./send-message.tool");

describe("mutate tool shapes", () => {
  it("saveJourney is inline (no confirmation)", () => {
    expect(saveJourneyTool.kind).toBe("mutate");
    expect(saveJourneyTool.confirm).toBe(false);
  });

  it("createItinerary / updateItinerary / sendMessage require confirmation", () => {
    for (const t of [createItineraryTool, updateItineraryTool, sendMessageTool]) {
      expect(t.kind).toBe("mutate");
      expect(t.confirm).toBe(true);
    }
  });
});

describe("input validation", () => {
  it("saveJourney needs a slug", () => {
    expect(saveJourneyTool.inputSchema.safeParse({}).success).toBe(false);
    expect(saveJourneyTool.inputSchema.safeParse({ slug: "kyoto-5d-abc" }).success).toBe(true);
    expect(saveJourneyTool.inputSchema.safeParse({ slug: "x", extra: 1 }).success).toBe(false);
  });

  it("createItinerary needs a title of 2+ chars", () => {
    expect(createItineraryTool.inputSchema.safeParse({ title: "K" }).success).toBe(false);
    expect(createItineraryTool.inputSchema.safeParse({ title: "Kyoto" }).success).toBe(true);
  });

  it("sendMessage needs a body and a target", () => {
    expect(sendMessageTool.inputSchema.safeParse({ body: "hi" }).success).toBe(false);
    expect(
      sendMessageTool.inputSchema.safeParse({ body: "hi", recipientHandle: "anaya" }).success,
    ).toBe(true);
    expect(sendMessageTool.inputSchema.safeParse({ body: "", journeySlug: "x" }).success).toBe(
      false,
    );
  });

  it("updateItinerary needs an itinerary ref", () => {
    expect(updateItineraryTool.inputSchema.safeParse({ title: "New" }).success).toBe(false);
    expect(
      updateItineraryTool.inputSchema.safeParse({ itinerary: "abc", status: "ACTIVE" }).success,
    ).toBe(true);
    expect(
      updateItineraryTool.inputSchema.safeParse({ itinerary: "abc", status: "BOGUS" }).success,
    ).toBe(false);
  });
});
