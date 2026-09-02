/**
 * Budget rollup for an itinerary. Always derived from the plan items — never
 * stored — so there is nothing to reconcile. All amounts are integer minor
 * units in the itinerary's `currency`.
 */

export interface DaySubtotal {
  dayNumber: number;
  subtotal: number;
}

export interface BudgetSummary {
  currency: string;
  perDay: DaySubtotal[];
  total: number;
  itemsWithCost: number;
  itemsTotal: number;
}

export function budgetSummary(
  days: { dayNumber: number; items: { cost: number | null }[] }[],
  currency: string,
): BudgetSummary {
  let total = 0;
  let itemsWithCost = 0;
  let itemsTotal = 0;

  const perDay = days.map((day) => {
    let subtotal = 0;
    for (const item of day.items) {
      itemsTotal += 1;
      if (typeof item.cost === "number") {
        subtotal += item.cost;
        itemsWithCost += 1;
      }
    }
    total += subtotal;
    return { dayNumber: day.dayNumber, subtotal };
  });

  return { currency, perDay, total, itemsWithCost, itemsTotal };
}
