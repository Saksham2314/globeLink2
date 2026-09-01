import { describe, expect, it } from "vitest";

import { slugifyTitle } from "./journey.slug";

describe("slugifyTitle", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyTitle("Four Days in Manali")).toBe("four-days-in-manali");
  });

  it("collapses punctuation and repeated separators", () => {
    expect(slugifyTitle("Goa — on a budget!! (2026)")).toBe("goa-on-a-budget-2026");
  });

  it("trims leading/trailing hyphens and caps length", () => {
    expect(slugifyTitle("  ...hello...  ")).toBe("hello");
    expect(slugifyTitle("x".repeat(100)).length).toBeLessThanOrEqual(60);
  });

  it("returns empty string for input with no usable characters", () => {
    expect(slugifyTitle("——")).toBe("");
  });
});
