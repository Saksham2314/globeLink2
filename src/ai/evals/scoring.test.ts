import { describe, expect, it } from "vitest";

import { looseTextEqual, scoreFields, setEqual, summariseSuite } from "./types";

describe("looseTextEqual", () => {
  it("ignores case and surrounding whitespace", () => {
    expect(looseTextEqual("  Kyoto ", "kyoto")).toBe(true);
  });
  it("treats null and undefined as the empty string", () => {
    expect(looseTextEqual(null, undefined)).toBe(true);
    expect(looseTextEqual(null, "")).toBe(true);
  });
  it("distinguishes different values", () => {
    expect(looseTextEqual("Kyoto", "Osaka")).toBe(false);
    expect(looseTextEqual(5, 6)).toBe(false);
  });
});

describe("setEqual", () => {
  it("is order-independent and dedupes", () => {
    expect(setEqual(["food", "culture"], ["culture", "food", "food"])).toBe(true);
  });
  it("defaults missing arrays to empty", () => {
    expect(setEqual(undefined, [])).toBe(true);
    expect(setEqual(["food"], undefined)).toBe(false);
  });
  it("fails on a size mismatch", () => {
    expect(setEqual(["food"], ["food", "culture"])).toBe(false);
  });
});

describe("scoreFields", () => {
  it("returns a perfect score when every specified key matches", () => {
    const { score, misses } = scoreFields(
      { destination: "Kyoto", styles: ["food"] },
      { destination: "kyoto", styles: ["Food"], region: null },
    );
    expect(score).toBe(1);
    expect(misses).toEqual([]);
  });

  it("scores the fraction of matching keys and lists misses", () => {
    const { score, misses } = scoreFields(
      { destination: "Kyoto", durationDays: 5 },
      { destination: "Kyoto", durationDays: 7 },
    );
    expect(score).toBe(0.5);
    expect(misses).toHaveLength(1);
    expect(misses[0]).toContain("durationDays");
  });

  it("is a no-op (score 1) when nothing is expected", () => {
    expect(scoreFields({}, { a: 1 }).score).toBe(1);
  });
});

describe("summariseSuite", () => {
  it("aggregates pass rate and mean score", () => {
    const report = summariseSuite(
      "demo",
      [
        { name: "a", passed: true, score: 1, detail: "" },
        { name: "b", passed: false, score: 0.5, detail: "" },
      ],
      1234,
    );
    expect(report.cases).toBe(2);
    expect(report.passed).toBe(1);
    expect(report.passRate).toBe(0.5);
    expect(report.meanScore).toBe(0.75);
    expect(report.durationMs).toBe(1234);
  });
});
