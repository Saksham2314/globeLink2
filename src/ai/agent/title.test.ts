import { describe, expect, it } from "vitest";

import { cleanSessionTitle } from "./title";

describe("cleanSessionTitle", () => {
  it("keeps a clean title as is", () => {
    expect(cleanSessionTitle("Mountain Escape Within Your Budget")).toBe(
      "Mountain Escape Within Your Budget",
    );
  });

  it("drops a markdown heading marker and anything after the first line", () => {
    expect(
      cleanSessionTitle(
        "# Cusco and Machu Picchu Adventure Planner\n\nHere's a suggested itinerary for you",
      ),
    ).toBe("Cusco and Machu Picchu Adventure Planner");
  });

  it("strips labels, quotes, emphasis and trailing punctuation", () => {
    expect(cleanSessionTitle('Title: "**Slow Days In Lisbon**".')).toBe("Slow Days In Lisbon");
    expect(cleanSessionTitle("\n\n- Bali Beyond The Beaches")).toBe("Bali Beyond The Beaches");
  });

  it("caps runaway answers at 8 words", () => {
    expect(
      cleanSessionTitle("One Two Three Four Five Six Seven Eight Nine Ten")?.split(" "),
    ).toHaveLength(8);
  });

  it("returns null for empty or too-short output", () => {
    expect(cleanSessionTitle("  \n ")).toBeNull();
    expect(cleanSessionTitle("# ")).toBeNull();
  });
});
