import { describe, expect, it } from "vitest";

import { MARKERS_SETTLED_AT, markerAppear, markerDelay } from "./intro-timing";

// A hair after the settle time (avoids float rounding at the exact boundary).
const SETTLED = MARKERS_SETTLED_AT + 1e-6;

describe("marker intro timing", () => {
  it("shows every marker, however many destinations there are", () => {
    for (const count of [1, 2, 7, 8, 11, 40, 60]) {
      for (let i = 0; i < count; i++) {
        expect(markerAppear(SETTLED, i, count), `${i}/${count}`).toBe(1);
        expect(markerAppear(MARKERS_SETTLED_AT + 100, i, count)).toBe(1);
      }
    }
  });

  it("regression: the 8th of 11 markers used to stay invisible", () => {
    expect(markerAppear(SETTLED, 7, 11)).toBe(1);
    expect(markerAppear(SETTLED, 10, 11)).toBe(1);
  });

  it("still staggers: later markers start later, none before the intro", () => {
    expect(markerAppear(0, 0, 11)).toBe(0);
    expect(markerDelay(10, 11)).toBeGreaterThan(markerDelay(0, 11));
    expect(markerDelay(0, 1)).toBe(markerDelay(0, 11));
  });
});
