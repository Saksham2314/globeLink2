import type { AtlasArc, AtlasData, AtlasDestination, GeoPrecision } from "./atlas.types";
import { normalizePlace, resolvePlace } from "./gazetteer";
import { centralAngle } from "./geo";

const MAX_ARCS = 8;

/** The fields `buildAtlasData` reads from each published journey. */
export interface AtlasJourneyRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  originName: string | null;
  destinationName: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  durationDays: number | null;
  budgetAmount: number | null;
  budgetCurrency: string;
  images: { url: string; isCover: boolean; position: number }[];
  days: { dayNumber: number; title: string | null }[];
  author: { name: string | null; handle: string | null };
}

/**
 * Group published journeys into globe destinations. Pure — no database.
 *
 * Journeys are grouped by the place they resolve to, not by their raw text,
 * so "Manali" and "Manali, Himachal Pradesh" are one destination whose list
 * holds every journey that went there (rows arrive newest first, and keep
 * that order).
 */
export function buildAtlasData(
  rows: AtlasJourneyRow[],
  savedIds: Set<string> | null = null,
): AtlasData {
  const byKey = new Map<string, AtlasDestination>();
  const usedIds = new Set<string>();
  const arcs: AtlasArc[] = [];
  const arcKeys = new Set<string>();

  for (const j of rows) {
    const placed = locate(j);
    if (!placed) continue;

    const statedPlace = j.destinationName?.split(",")[0]?.trim() || null;
    // A country-level point is labelled with the country itself.
    const label =
      placed.precision === "country"
        ? placed.country || j.country?.trim() || statedPlace
        : statedPlace || placed.country;
    if (!label) continue;

    const key = `${placed.precision}:${placed.lat.toFixed(2)},${placed.lng.toFixed(2)}`;
    let dest = byKey.get(key);
    if (!dest) {
      const params =
        placed.precision === "country" && j.country?.trim()
          ? new URLSearchParams({ country: j.country.trim() })
          : new URLSearchParams({ destination: label });
      dest = {
        id: uniqueId(normalizePlace(label).replace(/\s+/g, "-") || "place", usedIds),
        name: label,
        country: placed.country ?? j.country ?? null,
        lat: placed.lat,
        lng: placed.lng,
        precision: placed.precision,
        exploreHref: `/explore?${params.toString()}`,
        journeys: [],
      };
      byKey.set(key, dest);
    }

    const sortedImages = [...j.images].sort((a, b) => a.position - b.position);
    dest.journeys.push({
      id: j.id,
      slug: j.slug,
      title: j.title,
      summary: j.summary,
      authorName: j.author.name ?? (j.author.handle ? `@${j.author.handle}` : null),
      durationDays: j.durationDays,
      budgetAmount: j.budgetAmount,
      budgetCurrency: j.budgetCurrency,
      coverImageUrl: sortedImages.find((i) => i.isCover)?.url ?? sortedImages[0]?.url ?? null,
      ...(savedIds ? { isSaved: savedIds.has(j.id) } : {}),
      days: j.days,
    });

    const origin = j.originName?.trim() ? resolvePlace(j.originName) : null;
    if (origin && origin.precision === "place" && arcs.length < MAX_ARCS) {
      const from = { name: j.originName!.trim(), lat: origin.lat, lng: origin.lng };
      const to = { name: dest.name, lat: dest.lat, lng: dest.lng };
      const arcKey = `${normalizePlace(from.name)}>${dest.id}`;
      // Skip degenerate arcs (origin effectively at the destination).
      if (!arcKeys.has(arcKey) && centralAngle(from, to) > 0.002) {
        arcKeys.add(arcKey);
        arcs.push({ id: arcKey, destinationId: dest.id, from, to });
      }
    }
  }

  return { destinations: [...byKey.values()], arcs };
}

function uniqueId(base: string, used: Set<string>): string {
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

function locate(j: AtlasJourneyRow): {
  lat: number;
  lng: number;
  precision: GeoPrecision;
  country: string | null;
} | null {
  if (j.lat != null && j.lng != null && Math.abs(j.lat) <= 90 && Math.abs(j.lng) <= 180) {
    return { lat: j.lat, lng: j.lng, precision: "exact", country: j.country };
  }
  const hit = resolvePlace(j.destinationName, j.country);
  return hit
    ? { lat: hit.lat, lng: hit.lng, precision: hit.precision, country: hit.country }
    : null;
}
