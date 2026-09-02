import { describe, expect, it } from "vitest";

import {
  EMPTY_CONSTRAINTS,
  hasAnyConstraint,
  sanitizeConstraints,
  travelConstraintsSchema,
} from "./constraints.schema";

describe("travelConstraintsSchema", () => {
  it("accepts a fully-specified object", () => {
    const r = travelConstraintsSchema.safeParse({
      destination: "Kyoto",
      region: null,
      durationDays: 5,
      maxBudget: 80000,
      currency: "INR",
      month: "april",
      styles: ["slow", "culture"],
    });
    expect(r.success).toBe(true);
  });

  it("rejects a negative budget", () => {
    const r = travelConstraintsSchema.safeParse({ ...EMPTY_CONSTRAINTS, maxBudget: -10 });
    expect(r.success).toBe(false);
  });

  it("rejects durationDays over a year", () => {
    const r = travelConstraintsSchema.safeParse({ ...EMPTY_CONSTRAINTS, durationDays: 400 });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown travel style", () => {
    const r = travelConstraintsSchema.safeParse({ ...EMPTY_CONSTRAINTS, styles: ["teleporting"] });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown month", () => {
    const r = travelConstraintsSchema.safeParse({ ...EMPTY_CONSTRAINTS, month: "smarch" });
    expect(r.success).toBe(false);
  });
});

describe("sanitizeConstraints", () => {
  const raw = {
    destination: null,
    region: null,
    durationDays: null,
    maxBudget: null,
    currency: null,
    month: null,
    styles: [] as string[],
  };

  it("drops hallucinated / out-of-vocabulary styles and keeps valid ones", () => {
    const r = sanitizeConstraints({ ...raw, styles: ["family", "beach", "SLOW", "beach"] });
    expect(r.styles).toEqual(["family", "slow"]);
  });

  it("nulls an invalid month or currency, normalizes case", () => {
    expect(sanitizeConstraints({ ...raw, month: "December" }).month).toBe("december");
    expect(sanitizeConstraints({ ...raw, month: "smarch" }).month).toBeNull();
    expect(sanitizeConstraints({ ...raw, currency: "inr" }).currency).toBe("INR");
    expect(sanitizeConstraints({ ...raw, currency: "bitcoin" }).currency).toBeNull();
  });

  it("nulls out-of-range numbers rather than fabricating", () => {
    expect(sanitizeConstraints({ ...raw, durationDays: 400 }).durationDays).toBeNull();
    expect(sanitizeConstraints({ ...raw, durationDays: 4 }).durationDays).toBe(4);
    expect(sanitizeConstraints({ ...raw, maxBudget: -5 }).maxBudget).toBeNull();
  });

  it("treats model sentinel strings as null", () => {
    for (const s of ["<UNKNOWN>", "unknown", "N/A", "none", "not stated", "-"]) {
      expect(sanitizeConstraints({ ...raw, destination: s }).destination).toBeNull();
      expect(sanitizeConstraints({ ...raw, region: s }).region).toBeNull();
    }
    expect(sanitizeConstraints({ ...raw, destination: "Kyoto" }).destination).toBe("Kyoto");
  });

  it("produces a value that satisfies the strict schema", () => {
    const r = sanitizeConstraints({
      ...raw,
      destination: "  Kyoto  ",
      durationDays: 5.6,
      maxBudget: 80000,
      styles: ["culture", "nonsense"],
    });
    expect(travelConstraintsSchema.safeParse(r).success).toBe(true);
    expect(r.destination).toBe("Kyoto");
    expect(r.durationDays).toBe(6);
  });
});

describe("hasAnyConstraint", () => {
  it("is false for the empty object", () => {
    expect(hasAnyConstraint(EMPTY_CONSTRAINTS)).toBe(false);
  });

  it("is true when any signal is set", () => {
    expect(hasAnyConstraint({ ...EMPTY_CONSTRAINTS, destination: "Goa" })).toBe(true);
    expect(hasAnyConstraint({ ...EMPTY_CONSTRAINTS, styles: ["solo"] })).toBe(true);
    expect(hasAnyConstraint({ ...EMPTY_CONSTRAINTS, month: "june" })).toBe(true);
  });
});
