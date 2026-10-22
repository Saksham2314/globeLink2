/** DTOs for the landing-page globe. Plain data — safe to import from client code. */

/**
 * How a destination's coordinates were obtained:
 * - `exact`   the journey row itself carries lat/lng
 * - `place`   the destination name matched a known place in the gazetteer
 * - `country` only the country could be resolved — plotted at its centroid
 */
export type GeoPrecision = "exact" | "place" | "country";

export interface AtlasJourney {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  /** Display name of who published it (name, else @handle). */
  authorName: string | null;
  durationDays: number | null;
  budgetAmount: number | null;
  budgetCurrency: string;
  coverImageUrl: string | null;
  /** Only set when the viewer is signed in. */
  isSaved?: boolean;
  /** First few days, in order — titles only (no geography on stops yet). */
  days: { dayNumber: number; title: string | null }[];
}

export interface AtlasDestination {
  id: string;
  name: string;
  country: string | null;
  lat: number;
  lng: number;
  precision: GeoPrecision;
  /** Existing Explore URL that filters to this destination. */
  exploreHref: string;
  journeys: AtlasJourney[];
}

export interface AtlasArc {
  id: string;
  /** Destination id the arc ends at, so selecting it can emphasise the arc. */
  destinationId: string;
  from: { name: string; lat: number; lng: number };
  to: { name: string; lat: number; lng: number };
}

export interface AtlasData {
  destinations: AtlasDestination[];
  arcs: AtlasArc[];
}
