import { describe, expect, it } from "vitest";

import { buildAtlasData, type AtlasJourneyRow } from "./atlas.build";
import { __placeCountries, normalizePlace, resolveCountry, resolvePlace } from "./gazetteer";
import {
  centralAngle,
  facingRotation,
  framedRotation,
  greatCircleArc,
  latLngToVec3,
  wrapAngle,
} from "./geo";

describe("gazetteer", () => {
  it("names only countries that exist in the Natural Earth centroid table", () => {
    for (const c of __placeCountries) expect(resolveCountry(c), c).not.toBeNull();
  });

  it("normalises accents, case and punctuation", () => {
    expect(normalizePlace("  Hội  An! ")).toBe("hoi an");
    expect(normalizePlace("Marrakech, Morocco")).toBe("marrakech morocco");
  });

  it("resolves a known place, with aliases and a trailing region", () => {
    expect(resolvePlace("Manali")).toMatchObject({ precision: "place", country: "India" });
    expect(resolvePlace("Bangalore")).toEqual(resolvePlace("Bengaluru"));
    expect(resolvePlace("Manali, Himachal Pradesh")).toMatchObject({ lat: 32.24, lng: 77.19 });
  });

  it("falls back to the stated country's centroid for an unknown place", () => {
    expect(resolvePlace("Some Tiny Village", "India")).toMatchObject({
      precision: "country",
      country: "India",
    });
  });

  it("refuses to place a city in a country the journey contradicts", () => {
    const hit = resolvePlace("Paris", "United States");
    expect(hit).toMatchObject({ precision: "country", country: "United States of America" });
  });

  it("resolves a destination that is itself a country, and country aliases", () => {
    expect(resolvePlace("Japan")).toMatchObject({ precision: "country", country: "Japan" });
    expect(resolveCountry("UK")?.name).toBe("United Kingdom");
  });

  it("returns null rather than guessing", () => {
    expect(resolvePlace("Nowhereville")).toBeNull();
    expect(resolvePlace(null, null)).toBeNull();
  });
});

describe("geo", () => {
  const len = (v: number[]) => Math.hypot(v[0]!, v[1]!, v[2]!);

  it("puts the poles and the antimeridian where the texture expects them", () => {
    expect(latLngToVec3(90, 0)[1]).toBeCloseTo(1);
    const [x, , z] = latLngToVec3(0, -180);
    expect(x).toBeCloseTo(-1);
    expect(z).toBeCloseTo(0);
  });

  it("facingRotation brings the point onto +Z", () => {
    for (const [lat, lng] of [
      [32.24, 77.19],
      [-33.87, 151.21],
      [64.15, -21.94],
    ] as const) {
      const [x, y, z] = latLngToVec3(lat, lng);
      const { yaw, pitch } = facingRotation(lat, lng);
      // Ry(yaw) then Rx(pitch), as three applies Euler(pitch, yaw, 0, "XYZ").
      const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
      const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
      const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
      const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
      expect(x1).toBeCloseTo(0);
      expect(y2).toBeCloseTo(0);
      expect(z2).toBeCloseTo(1);
    }
  });

  it("framedRotation puts the point left of and above centre, still facing the camera", () => {
    const [x, y, z] = latLngToVec3(32.24, 77.19);
    const { yaw, pitch } = framedRotation(32.24, 77.19, -0.5, -0.12);
    const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
    const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
    const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
    expect(x1).toBeLessThan(-0.3);
    expect(y2).toBeGreaterThan(0.05);
    expect(z2).toBeGreaterThan(0.7);
    expect(framedRotation(10, 20, 0, 0)).toEqual(facingRotation(10, 20));
  });

  it("wrapAngle takes the short way round", () => {
    expect(wrapAngle(Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2);
    expect(wrapAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2);
    expect(wrapAngle(0.3)).toBeCloseTo(0.3);
  });

  it("arcs start and end on the surface and rise in between", () => {
    const a = { lat: 30.73, lng: 76.78 };
    const b = { lat: 32.24, lng: 77.19 };
    const pts = greatCircleArc(a, b, 20);
    expect(len(pts[0]!)).toBeCloseTo(1);
    expect(len(pts[20]!)).toBeCloseTo(1);
    expect(len(pts[10]!)).toBeGreaterThan(1);
    expect(centralAngle(a, b)).toBeGreaterThan(0);
  });
});

describe("buildAtlasData", () => {
  const row = (over: Partial<AtlasJourneyRow> & { id: string }): AtlasJourneyRow => ({
    slug: `${over.id}-slug`,
    title: `Trip ${over.id}`,
    summary: null,
    originName: null,
    destinationName: null,
    country: null,
    lat: null,
    lng: null,
    durationDays: null,
    budgetAmount: null,
    budgetCurrency: "INR",
    images: [],
    days: [],
    author: { name: "A", handle: "a" },
    ...over,
  });

  it("groups every journey to one place — whatever the spelling — newest first", () => {
    const { destinations } = buildAtlasData(
      [
        row({ id: "1", destinationName: "Manali", country: "India" }),
        row({ id: "2", destinationName: "Manali, Himachal Pradesh" }),
        row({ id: "3", destinationName: "manali" }),
        row({ id: "4", destinationName: "Tokyo" }),
      ],
      new Set(["2"]),
    );
    expect(destinations).toHaveLength(2);
    const manali = destinations.find((d) => d.name === "Manali")!;
    expect(manali.journeys.map((j) => j.id)).toEqual(["1", "2", "3"]);
    expect(manali.journeys.map((j) => j.isSaved)).toEqual([false, true, false]);
    expect(manali.exploreHref).toBe("/explore?destination=Manali");
  });

  it("leaves unplaceable journeys off the globe", () => {
    const { destinations } = buildAtlasData([row({ id: "1", destinationName: "Nowhereville" })]);
    expect(destinations).toEqual([]);
  });

  it("labels country-level points with the country and filters Explore by it", () => {
    const { destinations } = buildAtlasData([
      row({ id: "1", destinationName: "Some Tiny Village", country: "India" }),
      row({ id: "2", destinationName: "Another Hamlet", country: "India" }),
    ]);
    expect(destinations).toHaveLength(1);
    expect(destinations[0]).toMatchObject({ name: "India", precision: "country" });
    expect(destinations[0]!.exploreHref).toBe("/explore?country=India");
    expect(destinations[0]!.journeys).toHaveLength(2);
  });

  it("draws one arc per real origin → destination", () => {
    const { arcs } = buildAtlasData([
      row({ id: "1", destinationName: "Manali", originName: "Chandigarh" }),
      row({ id: "2", destinationName: "Manali", originName: "Chandigarh" }),
      row({ id: "3", destinationName: "Manali", originName: "Manali" }),
    ]);
    expect(arcs).toHaveLength(1);
    expect(arcs[0]!.destinationId).toBe("manali");
  });
});
