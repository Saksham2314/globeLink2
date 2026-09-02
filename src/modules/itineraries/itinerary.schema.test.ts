import { describe, expect, it } from "vitest";

import {
  createItinerarySchema,
  itineraryMetaSchema,
  planItemSchema,
  planSchema,
} from "./itinerary.schema";

describe("createItinerarySchema", () => {
  it("requires a title of at least 2 characters", () => {
    expect(createItinerarySchema.safeParse({ title: "K" }).success).toBe(false);
    expect(createItinerarySchema.safeParse({ title: "Kyoto" }).success).toBe(true);
  });

  it("normalises a blank destination to null", () => {
    const r = createItinerarySchema.parse({ title: "Kyoto", destinationName: "  " });
    expect(r.destinationName).toBeNull();
  });
});

describe("itineraryMetaSchema", () => {
  it("defaults status to DRAFT and currency to INR when missing", () => {
    const r = itineraryMetaSchema.parse({ title: "Trip" });
    expect(r.status).toBe("DRAFT");
    expect(r.currency).toBe("INR");
  });

  it("rejects an unknown status", () => {
    expect(itineraryMetaSchema.safeParse({ title: "Trip", status: "ARCHIVED" }).success).toBe(
      false,
    );
  });

  it("rejects an end date before the start date", () => {
    const r = itineraryMetaSchema.safeParse({
      title: "Trip",
      startDate: "2026-05-10",
      endDate: "2026-05-01",
    });
    expect(r.success).toBe(false);
  });

  it("allows equal start and end dates", () => {
    const r = itineraryMetaSchema.safeParse({
      title: "Trip",
      startDate: "2026-05-10",
      endDate: "2026-05-10",
    });
    expect(r.success).toBe(true);
  });

  it("tolerates null for every optional field (server-action serialization)", () => {
    const r = itineraryMetaSchema.safeParse({
      title: "Trip",
      destinationName: null,
      country: null,
      startDate: null,
      endDate: null,
      status: null,
      currency: null,
      notes: null,
    });
    expect(r.success).toBe(true);
  });
});

describe("planItemSchema", () => {
  it("requires a non-empty title", () => {
    expect(planItemSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("converts a major-unit cost to integer minor units", () => {
    const r = planItemSchema.parse({ title: "Museum", cost: "12.5" });
    expect(r.cost).toBe(1250);
  });

  it("treats an empty or invalid cost as null", () => {
    expect(planItemSchema.parse({ title: "Walk", cost: "" }).cost).toBeNull();
    expect(planItemSchema.parse({ title: "Walk", cost: "abc" }).cost).toBeNull();
  });

  it("defaults type to ACTIVITY", () => {
    expect(planItemSchema.parse({ title: "Walk" }).type).toBe("ACTIVITY");
  });
});

describe("planSchema", () => {
  it("accepts an empty plan", () => {
    expect(planSchema.parse({ days: [] })).toEqual({ days: [] });
  });

  it("rejects a day with more than 40 items", () => {
    const items = Array.from({ length: 41 }, () => ({ title: "x" }));
    expect(planSchema.safeParse({ days: [{ items }] }).success).toBe(false);
  });
});
