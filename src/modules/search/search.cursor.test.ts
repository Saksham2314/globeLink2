import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "./search.cursor";

describe("search cursor", () => {
  it("round-trips a cursor", () => {
    const c = { k: -0.4213, i: "cma1b2c3" };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });

  it("round-trips a large integer key (budget/duration sorts)", () => {
    const c = { k: 2147483647, i: "x" };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });

  it("returns null for undefined / empty", () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
  });

  it("returns null for a malformed cursor", () => {
    expect(decodeCursor("not-base64!!")).toBeNull();
    expect(decodeCursor(Buffer.from('{"nope":1}').toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from('["a","b"]').toString("base64url"))).toBeNull();
  });
});
