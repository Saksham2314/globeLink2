import { describe, expect, it } from "vitest";

import { formatDateRange, formatDuration, formatMoney } from "./format";

describe("formatMoney", () => {
  it("is the same everywhere — fixed locale, Indian grouping for ₹", () => {
    expect(formatMoney(14_000_000, "INR")).toBe("₹1,40,000");
    expect(formatMoney(1_500_000, "INR")).toBe("₹15,000");
  });

  it("handles other currencies and missing values", () => {
    expect(formatMoney(250_000, "USD")).toContain("2,500");
    expect(formatMoney(null)).toBeNull();
  });
});

describe("formatDateRange", () => {
  it("shows journey calendar dates in UTC, whatever the viewer's timezone", () => {
    expect(formatDateRange("2026-05-09T00:00:00.000Z", "2026-05-14T00:00:00.000Z")).toBe(
      "9 May – 14 May 2026",
    );
    expect(formatDateRange("2025-12-26T00:00:00.000Z", "2026-01-02T00:00:00.000Z")).toBe(
      "26 Dec 2025 – 2 Jan 2026",
    );
  });
});

describe("formatDuration", () => {
  it("pluralises", () => {
    expect(formatDuration(1)).toBe("1 day");
    expect(formatDuration(7)).toBe("7 days");
    expect(formatDuration(0)).toBeNull();
  });
});
