import { describe, expect, it } from "vitest";

import { EMPTY_CONSTRAINTS } from "./constraints.schema";
import { summarizeConstraints, travelConstraintsToSearchParams } from "./to-search-params";

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

describe("summarizeConstraints", () => {
  it("reads back the understood constraints", () => {
    const s = summarizeConstraints(
      c({ destination: "Kyoto", durationDays: 5, maxBudget: 80000, currency: "INR", styles: ["slow"] }),
    );
    expect(s).toContain("Kyoto");
    expect(s).toContain("5 days");
    expect(s).toContain("slow");
  });
});
