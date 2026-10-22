import { describe, expect, it } from "vitest";

import {
  checkItineraryDates,
  createJourneySchema,
  isPublishable,
  itinerarySchema,
  journeyBudgetSchema,
  journeyContentSchema,
  journeyRouteSchema,
  MAX_TIPS,
  publishRequirements,
  TIP_MAX_LENGTH,
} from "./journey.schema";
import { submittedValues } from "@/lib/forms";

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

  it("rejects a start date in the future", () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const r = journeyRouteSchema.safeParse({ startDate: nextYear.toISOString().slice(0, 10) });
    expect(r.success).toBe(false);
  });

  it("accepts past dates", () => {
    const r = journeyRouteSchema.safeParse({ startDate: "2024-05-01", endDate: "2024-05-06" });
    expect(r.success).toBe(true);
  });

  it("normalises empty / null date fields to null", () => {
    const r = journeyRouteSchema.parse({ startDate: "", endDate: null, durationDays: "" });
    expect(r).toEqual({ startDate: null, endDate: null, durationDays: null });
  });
});

describe("itinerary schema — null-safety", () => {
  it("accepts null for every optional field (server-action serialization)", () => {
    const r = itinerarySchema.safeParse({
      days: [
        {
          title: null,
          date: null,
          notes: null,
          stops: [
            {
              time: null,
              type: null,
              title: "Sunrise hike",
              description: null,
              locationName: null,
            },
          ],
        },
      ],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      const stop = r.data.days[0]!.stops[0]!;
      expect(stop.type).toBe("ACTIVITY");
      expect(stop.description).toBeNull();
      expect(r.data.days[0]!.title).toBeNull();
    }
  });
});

describe("checkItineraryDates", () => {
  const start = new Date("2024-05-01");
  const end = new Date("2024-05-06");

  it("passes when day dates are inside the trip window", () => {
    expect(checkItineraryDates([{ date: new Date("2024-05-03") }], start, end)).toBeNull();
  });

  it("flags a day before the trip starts", () => {
    expect(checkItineraryDates([{ date: new Date("2024-04-28") }], start, end)).toMatch(/before/);
  });

  it("flags a day after the trip ends", () => {
    expect(checkItineraryDates([{ date: new Date("2024-05-09") }], start, end)).toMatch(/after/);
  });

  it("flags a day in the future even with no trip window", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(checkItineraryDates([{ date: future }], null, null)).toMatch(/future/);
  });

  it("ignores days with no date", () => {
    expect(checkItineraryDates([{ date: null }, { date: null }], start, end)).toBeNull();
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

describe("journeyContentSchema tips", () => {
  it("accepts a tip right at the limit", () => {
    const r = journeyContentSchema.safeParse({ tips: ["a".repeat(TIP_MAX_LENGTH)] });
    expect(r.success).toBe(true);
  });

  it("names the over-long tip and says how to fix it", () => {
    const r = journeyContentSchema.safeParse({ tips: ["short", "b".repeat(612)] });
    expect(r.success).toBe(false);
    const msg = r.success ? "" : r.error.issues[0]!.message;
    expect(msg).toContain("Tip 2 is 612 characters");
    expect(msg).toContain(String(TIP_MAX_LENGTH));
    expect(r.success ? null : r.error.issues[0]!.path[0]).toBe("tips");
  });

  it("caps the number of tips", () => {
    const r = journeyContentSchema.safeParse({
      tips: Array.from({ length: MAX_TIPS + 1 }, () => "x"),
    });
    expect(r.success).toBe(false);
  });
});

describe("submittedValues", () => {
  it("echoes only the named text fields", () => {
    const fd = new FormData();
    fd.set("description", "my story");
    fd.set("tips", "one\ntwo");
    fd.set("journeyId", "j1");
    expect(submittedValues(fd, ["description", "tips", "missing"])).toEqual({
      description: "my story",
      tips: "one\ntwo",
    });
  });
});
