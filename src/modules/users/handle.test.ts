import { describe, expect, it } from "vitest";

import { HANDLE_PATTERN, isHandleAvailableShape } from "./handle";

describe("HANDLE_PATTERN", () => {
  it.each(["anaya", "anaya-t", "traveller-1a2b", "a1b", "abcdefghij0123456789"])(
    "accepts %s",
    (h) => expect(HANDLE_PATTERN.test(h)).toBe(true),
  );

  it.each(["ab", "-anaya", "anaya-", "Anaya", "an aya", "way-too-long-a-handle-value"])(
    "rejects %s",
    (h) => expect(HANDLE_PATTERN.test(h)).toBe(false),
  );
});

describe("isHandleAvailableShape", () => {
  it("rejects reserved words even when well-formed", () => {
    expect(isHandleAvailableShape("settings")).toBe(false);
    expect(isHandleAvailableShape("admin")).toBe(false);
  });

  it("accepts an ordinary well-formed handle", () => {
    expect(isHandleAvailableShape("anaya-travels")).toBe(true);
  });
});
