import { describe, expect, it } from "vitest";

import { DEFAULT_LIMIT, MAX_LIMIT, hasActiveFilters, searchParamsSchema } from "./search.schema";

const parse = (raw: Record<string, string>) => searchParamsSchema.parse(raw);

describe("searchParamsSchema", () => {
  it("defaults an empty query", () => {
    const p = parse({});
    expect(p.q).toBeUndefined();
    expect(p.styles).toEqual([]);
    expect(p.transport).toEqual([]);
    expect(p.sort).toBe("relevance");
    expect(p.limit).toBe(DEFAULT_LIMIT);
    expect(hasActiveFilters(p)).toBe(false);
  });

  it("trims and caps free text", () => {
    expect(parse({ q: "  manali  " }).q).toBe("manali");
    expect(parse({ destination: "x".repeat(200) }).destination?.length).toBe(80);
  });

  it("keeps only known styles / transport from the CSV", () => {
    const p = parse({ styles: "solo,teleport,slow", transport: "train,rocket" });
    expect(p.styles).toEqual(["solo", "slow"]);
    expect(p.transport).toEqual(["train"]);
  });

  it("coerces numeric filters and rejects nonsense", () => {
    expect(parse({ maxBudget: "15000" }).maxBudget).toBe(15000);
    expect(parse({ maxBudget: "-5" }).maxBudget).toBeUndefined();
    expect(parse({ maxDays: "9999" }).maxDays).toBeUndefined();
    expect(parse({ minDays: "3" }).minDays).toBe(3);
  });

  it("falls back to relevance for an unknown sort and clamps the limit", () => {
    expect(parse({ sort: "wat" }).sort).toBe("relevance");
    expect(parse({ sort: "budget" }).sort).toBe("budget");
    expect(parse({ limit: "500" }).limit).toBe(MAX_LIMIT);
    expect(parse({ limit: "0" }).limit).toBe(DEFAULT_LIMIT);
  });

  it("reports active filters", () => {
    expect(hasActiveFilters(parse({ q: "goa" }))).toBe(true);
    expect(hasActiveFilters(parse({ styles: "solo" }))).toBe(true);
    expect(hasActiveFilters(parse({ sort: "recent" }))).toBe(false);
  });
});
