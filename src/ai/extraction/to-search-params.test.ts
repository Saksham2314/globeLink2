import { describe, expect, it } from "vitest";

import { EMPTY_CONSTRAINTS } from "./constraints.schema";
import {
  describeRelaxed,
  relaxationLadder,
  summarizeConstraints,
  travelConstraintsToSearchParams,
} from "./to-search-params";

const c = (over: Partial<typeof EMPTY_CONSTRAINTS>) => ({ ...EMPTY_CONSTRAINTS, ...over });

describe("travelConstraintsToSearchParams", () => {
  it("maps an empty object to no params", () => {
    expect(travelConstraintsToSearchParams(EMPTY_CONSTRAINTS)).toEqual({});
  });

  it("maps destination, duration, budget and styles", () => {
    expect(
      travelConstraintsToSearchParams(
        c({ destination: "Kyoto", durationDays: 5, maxBudget: 80000, styles: ["slow", "culture"] }),
      ),
    ).toEqual({ destination: "Kyoto", maxDays: "5", maxBudget: "80000", styles: "slow,culture" });
  });

  it("falls back to a text query for a region when there is no destination", () => {
    expect(travelConstraintsToSearchParams(c({ region: "Rajasthan" }))).toEqual({ q: "Rajasthan" });
  });

  it("prefers destination over region", () => {
    expect(
      travelConstraintsToSearchParams(c({ destination: "Jaipur", region: "Rajasthan" })),
    ).toEqual({ destination: "Jaipur" });
  });

  it("does not map month in Phase 6", () => {
    expect(travelConstraintsToSearchParams(c({ month: "april" }))).toEqual({});
  });
});

describe("relaxationLadder", () => {
  it("drops styles, then trip length, then budget — never the destination", () => {
    const steps = relaxationLadder({
      destination: "Lisbon",
      maxDays: "6",
      maxBudget: "150000",
      styles: "slow",
    });
    expect(steps).toEqual([
      {
        params: { destination: "Lisbon", maxDays: "6", maxBudget: "150000" },
        dropped: ["styles"],
      },
      { params: { destination: "Lisbon", maxBudget: "150000" }, dropped: ["styles", "maxDays"] },
      { params: { destination: "Lisbon" }, dropped: ["styles", "maxDays", "maxBudget"] },
    ]);
  });

  it("skips filters that are not set", () => {
    expect(relaxationLadder({ destination: "Bali", maxDays: "7" })).toEqual([
      { params: { destination: "Bali" }, dropped: ["maxDays"] },
    ]);
  });

  it("has nothing to loosen for destination or text alone", () => {
    expect(relaxationLadder({ destination: "Kyoto" })).toEqual([]);
    expect(relaxationLadder({ q: "Rajasthan" })).toEqual([]);
  });
});

describe("describeRelaxed", () => {
  const k = c({ durationDays: 6, maxBudget: 150000, currency: "INR", styles: ["slow", "city"] });
  it("labels each dropped filter", () => {
    expect(describeRelaxed("styles", k)).toBe("slow, city");
    expect(describeRelaxed("maxDays", k)).toBe("≤ 6 days");
    expect(describeRelaxed("maxBudget", k)).toBe("under ₹1,50,000");
  });
});

describe("summarizeConstraints", () => {
  it("reads back the understood constraints", () => {
    const s = summarizeConstraints(
      c({
        destination: "Kyoto",
        durationDays: 5,
        maxBudget: 80000,
        currency: "INR",
        styles: ["slow"],
      }),
    );
    expect(s).toContain("Kyoto");
    expect(s).toContain("5 days");
    expect(s).toContain("slow");
  });
});
