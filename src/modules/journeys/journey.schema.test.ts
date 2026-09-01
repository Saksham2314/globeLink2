import { describe, expect, it } from "vitest";

import {
  createJourneySchema,
  isPublishable,
  itinerarySchema,
  journeyBudgetSchema,
  journeyRouteSchema,
  publishRequirements,
} from "./journey.schema";

describe("createJourneySchema", () => {
  it("requires a title of at least 3 characters", () => {
    expect(createJourneySchema.safeParse({ title: "Hi" }).success).toBe(false);
    expect(createJourneySchema.safeParse({ title: "Goa weekend" }).success).toBe(true);
  });
});

describe("journeyBudgetSchema", () => {
  it("converts a major-unit amount to integer minor units", () => {
    const r = journeyBudgetSchema.parse({
      budgetAmount: "15000",
      budgetCurrency: "INR",
      transportModes: [],
      travelStyle: [],
    });
    expect(r.budgetAmount).toBe(1_500_000);
  });

  it("treats an empty amount as null", () => {
    const r = journeyBudgetSchema.parse({
      budgetAmount: "",
      budgetCurrency: "USD",
      transportModes: ["flight", "train"],
      travelStyle: ["solo"],
    });
    expect(r.budgetAmount).toBeNull();
  });

  it("rejects an unknown transport mode", () => {
    const r = journeyBudgetSchema.safeParse({
      budgetCurrency: "INR",
      transportModes: ["teleport"],
      travelStyle: [],
    });
    expect(r.success).toBe(false);
  });
});

describe("journeyRouteSchema", () => {
  it("rejects an end date before the start date", () => {
    const r = journeyRouteSchema.safeParse({
      startDate: "2026-03-10",
      endDate: "2026-03-05",
    });
    expect(r.success).toBe(false);
  });

  it("accepts a duration with no dates", () => {
    const r = journeyRouteSchema.parse({ durationDays: "5" });
    expect(r.durationDays).toBe(5);
  });
});

describe("itinerarySchema", () => {
  it("requires every stop to have a title", () => {
    const r = itinerarySchema.safeParse({
      days: [{ stops: [{ type: "ACTIVITY", title: "" }] }],
    });
    expect(r.success).toBe(false);
  });

  it("accepts a well-formed itinerary", () => {
    const r = itinerarySchema.safeParse({
      days: [
        { title: "Arrival", stops: [{ type: "TRANSIT", title: "Bus from Delhi" }] },
        { stops: [] },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("publish readiness", () => {
  const base = {
    title: "Four days in Manali",
    destinationName: "Manali",
    summary: null,
    description: null,
    startDate: null,
    durationDays: null,
  };

  it("lists what is still missing", () => {
    const missing = publishRequirements(base)
      .filter((r) => !r.met)
      .map((r) => r.key);
    expect(missing).toEqual(["story", "duration"]);
    expect(isPublishable(base)).toBe(false);
  });

  it("passes once a story and duration are present", () => {
    expect(isPublishable({ ...base, description: "It was great", durationDays: 4 })).toBe(true);
  });
});
