import { describe, expect, it } from "vitest";

import { looksLikeNaturalLanguageQuery } from "./heuristic";

describe("looksLikeNaturalLanguageQuery", () => {
  it("is false for short keyword queries", () => {
    expect(looksLikeNaturalLanguageQuery("Manali")).toBe(false);
    expect(looksLikeNaturalLanguageQuery("Goa")).toBe(false);
    expect(looksLikeNaturalLanguageQuery("kyoto japan")).toBe(false);
  });

  it("is true for a four-plus word phrase", () => {
    expect(looksLikeNaturalLanguageQuery("four days in the mountains")).toBe(true);
  });

  it("is true for a short phrase with a number or money", () => {
    expect(looksLikeNaturalLanguageQuery("Kyoto 80000")).toBe(true);
    expect(looksLikeNaturalLanguageQuery("goa ₹20000")).toBe(true);
  });

  it("is true for a short phrase with a travel hint word", () => {
    expect(looksLikeNaturalLanguageQuery("solo trip")).toBe(true);
    expect(looksLikeNaturalLanguageQuery("relaxed holiday")).toBe(true);
  });

  it("is false for empty or tiny input", () => {
    expect(looksLikeNaturalLanguageQuery("")).toBe(false);
    expect(looksLikeNaturalLanguageQuery("hi")).toBe(false);
  });
});
