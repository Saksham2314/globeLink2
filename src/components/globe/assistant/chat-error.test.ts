import { describe, expect, it } from "vitest";

import { readableError } from "./chat-error";

describe("readableError", () => {
  it("unwraps the agent route's JSON error body", () => {
    expect(
      readableError(
        new Error(
          '{"error":"You\'ve reached today\'s assistant usage limit. It resets in 24 hours."}',
        ),
      ),
    ).toBe("You've reached today's assistant usage limit. It resets in 24 hours.");
  });

  it("never shows raw JSON or plain status words", () => {
    expect(readableError(new Error('{"oops":1}'))).toBe("Something went wrong. Try again.");
    expect(readableError(new Error("{not json"))).toBe("Something went wrong. Try again.");
    expect(readableError(new Error("Unauthorized"))).toMatch(/sign in again/);
    expect(readableError(new Error("Bad request"))).toMatch(/couldn't be sent/);
  });

  it("passes ordinary messages through and covers an empty one", () => {
    expect(readableError(new Error("Network error"))).toBe("Network error");
    expect(readableError(new Error(""))).toBe("Something went wrong. Try again.");
  });
});
