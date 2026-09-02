import { describe, expect, it } from "vitest";

import { MAX_MESSAGE_LENGTH, sendMessageSchema, startConversationSchema } from "./messaging.schema";

describe("sendMessageSchema", () => {
  it("trims the body", () => {
    expect(sendMessageSchema.parse({ body: "  hello  " })).toEqual({ body: "hello" });
  });

  it("rejects an empty or whitespace-only body", () => {
    expect(sendMessageSchema.safeParse({ body: "" }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ body: "   " }).success).toBe(false);
  });

  it("rejects a body over the limit", () => {
    expect(sendMessageSchema.safeParse({ body: "x".repeat(MAX_MESSAGE_LENGTH + 1) }).success).toBe(
      false,
    );
    expect(sendMessageSchema.safeParse({ body: "x".repeat(MAX_MESSAGE_LENGTH) }).success).toBe(
      true,
    );
  });
});

describe("startConversationSchema", () => {
  it("requires a recipient id", () => {
    expect(startConversationSchema.safeParse({ recipientId: "" }).success).toBe(false);
    expect(startConversationSchema.safeParse({ recipientId: "u1" }).success).toBe(true);
  });

  it("normalises an empty journeyId to undefined", () => {
    expect(
      startConversationSchema.parse({ recipientId: "u1", journeyId: "" }).journeyId,
    ).toBeUndefined();
    expect(startConversationSchema.parse({ recipientId: "u1", journeyId: "j1" }).journeyId).toBe(
      "j1",
    );
  });
});
