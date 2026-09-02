import { describe, expect, it } from "vitest";

import { pairKey } from "./pair-key";

describe("pairKey", () => {
  it("is order-independent", () => {
    expect(pairKey("alice", "bob")).toBe(pairKey("bob", "alice"));
  });

  it("joins the sorted ids with a colon", () => {
    expect(pairKey("bob", "alice")).toBe("alice:bob");
    expect(pairKey("cma00001", "cma00002")).toBe("cma00001:cma00002");
  });

  it("is stable across calls", () => {
    const a = "cmb1111111111111111111111";
    const b = "cmb2222222222222222222222";
    expect(pairKey(a, b)).toBe(pairKey(a, b));
    expect(pairKey(a, b)).toBe(pairKey(b, a));
  });
});
