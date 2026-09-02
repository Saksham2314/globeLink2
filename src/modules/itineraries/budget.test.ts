import { describe, expect, it } from "vitest";

import { budgetSummary } from "./budget";

describe("budgetSummary", () => {
  it("returns zeros for an empty plan", () => {
    const s = budgetSummary([], "INR");
    expect(s).toEqual({
      currency: "INR",
      perDay: [],
      total: 0,
      itemsWithCost: 0,
      itemsTotal: 0,
    });
  });

  it("ignores items with no cost but still counts them", () => {
    const s = budgetSummary([{ dayNumber: 1, items: [{ cost: null }, { cost: null }] }], "USD");
    expect(s.total).toBe(0);
    expect(s.itemsTotal).toBe(2);
    expect(s.itemsWithCost).toBe(0);
    expect(s.perDay).toEqual([{ dayNumber: 1, subtotal: 0 }]);
  });

  it("sums per-day subtotals and a grand total across days", () => {
    const s = budgetSummary(
      [
        { dayNumber: 1, items: [{ cost: 1000 }, { cost: 500 }, { cost: null }] },
        { dayNumber: 2, items: [{ cost: 2500 }] },
      ],
      "INR",
    );
    expect(s.perDay).toEqual([
      { dayNumber: 1, subtotal: 1500 },
      { dayNumber: 2, subtotal: 2500 },
    ]);
    expect(s.total).toBe(4000);
    expect(s.itemsWithCost).toBe(3);
    expect(s.itemsTotal).toBe(4);
  });

  it("treats a zero cost as a real (counted) amount", () => {
    const s = budgetSummary([{ dayNumber: 1, items: [{ cost: 0 }] }], "EUR");
    expect(s.itemsWithCost).toBe(1);
    expect(s.total).toBe(0);
  });
});
