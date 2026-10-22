import centroids from "./country-centroids.json";

/**
 * Resolves the free-text place names journeys carry (`destinationName`,
 * `originName`, `country`) to real coordinates, for the landing globe.
 *
 * Journeys don't store coordinates yet, so this is a static lookup: a curated
 * table of well-known travel places with their real lat/lng, plus every
 * country's centroid computed from Natural Earth (see
 * scripts/generate-earth-atlas.mjs). Anything it can't match returns null —
 * the caller leaves it off the globe rather than guessing.
 */

export interface ResolvedPlace {
  lat: number;
  lng: number;
  precision: "place" | "country";
  /** Canonical country name (Natural Earth spelling). */
  country: string;
}

/** `[names separated by |, lat, lng, Natural Earth country name]` */
const PLACES: [string, number, number, string][] = [
  // India
  ["manali", 32.24, 77.19, "India"],
  ["chandigarh", 30.73, 76.78, "India"],
  ["delhi|new delhi", 28.61, 77.21, "India"],
  ["mumbai|bombay", 19.08, 72.88, "India"],
  ["goa|panaji", 15.49, 73.83, "India"],
  ["jaipur", 26.91, 75.79, "India"],
  ["udaipur", 24.59, 73.71, "India"],
  ["jodhpur", 26.24, 73.02, "India"],
  ["jaisalmer", 26.92, 70.91, "India"],
  ["agra", 27.18, 78.01, "India"],
  ["varanasi|benaras|banaras", 25.32, 82.97, "India"],
  ["rishikesh", 30.09, 78.27, "India"],
  ["haridwar", 29.95, 78.16, "India"],
  ["shimla", 31.1, 77.17, "India"],
  ["dharamshala|dharamsala", 32.22, 76.32, "India"],
  ["mcleod ganj|mcleodganj", 32.24, 76.32, "India"],
  ["kasol", 32.01, 77.31, "India"],
  ["leh|ladakh", 34.15, 77.58, "India"],
  ["srinagar|kashmir", 34.08, 74.8, "India"],
  ["amritsar", 31.63, 74.87, "India"],
  ["darjeeling", 27.04, 88.26, "India"],
  ["gangtok|sikkim", 27.33, 88.61, "India"],
  ["kolkata|calcutta", 22.57, 88.36, "India"],
  ["bengaluru|bangalore", 12.97, 77.59, "India"],
  ["mysuru|mysore", 12.3, 76.64, "India"],
  ["chennai|madras", 13.08, 80.27, "India"],
  ["hyderabad", 17.39, 78.49, "India"],
  ["pune", 18.52, 73.86, "India"],
  ["ahmedabad", 23.02, 72.57, "India"],
  ["lucknow", 26.85, 80.95, "India"],
  ["kochi|cochin", 9.93, 76.27, "India"],
  ["munnar", 10.09, 77.06, "India"],
  ["alleppey|alappuzha", 9.5, 76.34, "India"],
  ["pondicherry|puducherry", 11.94, 79.81, "India"],
  ["hampi", 15.34, 76.46, "India"],
  ["ooty|udhagamandalam", 11.41, 76.7, "India"],
  ["coorg|madikeri", 12.42, 75.74, "India"],
  ["nainital", 29.38, 79.46, "India"],
  ["mussoorie", 30.46, 78.07, "India"],
  ["spiti|kaza", 32.23, 78.07, "India"],
  ["port blair|andaman", 11.62, 92.73, "India"],
  // South Asia
  ["kathmandu", 27.72, 85.32, "Nepal"],
  ["pokhara", 28.21, 83.99, "Nepal"],
  ["thimphu", 27.47, 89.64, "Bhutan"],
  ["paro", 27.43, 89.42, "Bhutan"],
  ["colombo", 6.93, 79.86, "Sri Lanka"],
  ["kandy", 7.29, 80.63, "Sri Lanka"],
  ["ella", 6.87, 81.05, "Sri Lanka"],
  ["male", 4.18, 73.51, "Maldives"],
  // Southeast Asia
  ["bangkok", 13.76, 100.5, "Thailand"],
  ["chiang mai", 18.79, 98.98, "Thailand"],
  ["phuket", 7.88, 98.39, "Thailand"],
  ["krabi", 8.09, 98.91, "Thailand"],
  ["bali", -8.41, 115.19, "Indonesia"],
  ["ubud", -8.51, 115.26, "Indonesia"],
  ["jakarta", -6.21, 106.85, "Indonesia"],
  ["singapore", 1.35, 103.82, "Singapore"],
  ["kuala lumpur", 3.14, 101.69, "Malaysia"],
  ["langkawi", 6.35, 99.8, "Malaysia"],
  ["hanoi", 21.03, 105.85, "Vietnam"],
  ["ha long bay|halong bay|ha long", 20.91, 107.18, "Vietnam"],
  ["hoi an", 15.88, 108.33, "Vietnam"],
  ["da nang|danang", 16.05, 108.21, "Vietnam"],
  ["ho chi minh city|saigon|ho chi minh", 10.82, 106.63, "Vietnam"],
  ["siem reap|angkor wat|angkor", 13.36, 103.86, "Cambodia"],
  ["phnom penh", 11.56, 104.93, "Cambodia"],
  ["luang prabang", 19.89, 102.13, "Laos"],
  ["manila", 14.6, 120.98, "Philippines"],
  ["el nido|palawan", 11.18, 119.39, "Philippines"],
  // East Asia
  ["tokyo", 35.68, 139.69, "Japan"],
  ["kyoto", 35.01, 135.77, "Japan"],
  ["osaka", 34.69, 135.5, "Japan"],
  ["mount fuji|mt fuji|fuji", 35.36, 138.73, "Japan"],
  ["hiroshima", 34.39, 132.46, "Japan"],
  ["nara", 34.69, 135.8, "Japan"],
  ["sapporo|hokkaido", 43.06, 141.35, "Japan"],
  ["seoul", 37.57, 126.98, "South Korea"],
  ["busan", 35.18, 129.08, "South Korea"],
  ["jeju|jeju island", 33.5, 126.53, "South Korea"],
  ["beijing", 39.9, 116.4, "China"],
  ["shanghai", 31.23, 121.47, "China"],
  ["hong kong", 22.32, 114.17, "Hong Kong"],
  ["taipei", 25.03, 121.57, "Taiwan"],
  // Middle East & Africa
  ["dubai", 25.2, 55.27, "United Arab Emirates"],
  ["abu dhabi", 24.45, 54.38, "United Arab Emirates"],
  ["istanbul", 41.01, 28.98, "Turkey"],
  ["cappadocia|goreme", 38.64, 34.83, "Turkey"],
  ["petra", 30.33, 35.44, "Jordan"],
  ["cairo", 30.04, 31.24, "Egypt"],
  ["marrakech|marrakesh", 31.63, -7.99, "Morocco"],
  ["cape town", -33.92, 18.42, "South Africa"],
  ["nairobi", -1.29, 36.82, "Kenya"],
  ["zanzibar", -6.16, 39.19, "Tanzania"],
  ["kilimanjaro", -3.07, 37.36, "Tanzania"],
  // Europe
  ["london", 51.51, -0.13, "United Kingdom"],
  ["edinburgh", 55.95, -3.19, "United Kingdom"],
  ["paris", 48.86, 2.35, "France"],
  ["nice", 43.7, 7.27, "France"],
  ["rome", 41.9, 12.5, "Italy"],
  ["florence", 43.77, 11.26, "Italy"],
  ["venice", 45.44, 12.32, "Italy"],
  ["milan", 45.46, 9.19, "Italy"],
  ["amalfi|amalfi coast", 40.63, 14.6, "Italy"],
  ["barcelona", 41.39, 2.17, "Spain"],
  ["madrid", 40.42, -3.7, "Spain"],
  ["seville|sevilla", 37.39, -5.98, "Spain"],
  ["lisbon|lisboa", 38.72, -9.14, "Portugal"],
  ["porto", 41.15, -8.61, "Portugal"],
  ["amsterdam", 52.37, 4.9, "Netherlands"],
  ["berlin", 52.52, 13.4, "Germany"],
  ["munich", 48.14, 11.58, "Germany"],
  ["prague", 50.08, 14.44, "Czechia"],
  ["vienna", 48.21, 16.37, "Austria"],
  ["budapest", 47.5, 19.04, "Hungary"],
  ["zurich", 47.38, 8.54, "Switzerland"],
  ["interlaken", 46.69, 7.86, "Switzerland"],
  ["athens", 37.98, 23.73, "Greece"],
  ["santorini", 36.39, 25.46, "Greece"],
  ["dubrovnik", 42.65, 18.09, "Croatia"],
  ["reykjavik", 64.15, -21.94, "Iceland"],
  ["copenhagen", 55.68, 12.57, "Denmark"],
  ["stockholm", 59.33, 18.07, "Sweden"],
  ["oslo", 59.91, 10.75, "Norway"],
  ["tromso", 69.65, 18.96, "Norway"],
  ["dublin", 53.35, -6.26, "Ireland"],
  // Americas
  ["new york|new york city|nyc", 40.71, -74.01, "United States of America"],
  ["san francisco", 37.77, -122.42, "United States of America"],
  ["los angeles", 34.05, -118.24, "United States of America"],
  ["las vegas", 36.17, -115.14, "United States of America"],
  ["chicago", 41.88, -87.63, "United States of America"],
  ["miami", 25.76, -80.19, "United States of America"],
  ["grand canyon", 36.11, -112.11, "United States of America"],
  ["yosemite", 37.87, -119.54, "United States of America"],
  ["vancouver", 49.28, -123.12, "Canada"],
  ["toronto", 43.65, -79.38, "Canada"],
  ["banff", 51.18, -115.57, "Canada"],
  ["mexico city", 19.43, -99.13, "Mexico"],
  ["cancun", 21.16, -86.85, "Mexico"],
  ["tulum", 20.21, -87.47, "Mexico"],
  ["havana", 23.11, -82.37, "Cuba"],
  ["cusco|cuzco", -13.53, -71.97, "Peru"],
  ["machu picchu", -13.16, -72.55, "Peru"],
  ["lima", -12.05, -77.04, "Peru"],
  ["rio de janeiro|rio", -22.91, -43.17, "Brazil"],
  ["buenos aires", -34.6, -58.38, "Argentina"],
  ["santiago", -33.45, -70.67, "Chile"],
  // Oceania
  ["sydney", -33.87, 151.21, "Australia"],
  ["melbourne", -37.81, 144.96, "Australia"],
  ["cairns", -16.92, 145.77, "Australia"],
  ["auckland", -36.85, 174.76, "New Zealand"],
  ["queenstown", -45.03, 168.66, "New Zealand"],
];

/** Common spellings → Natural Earth country names. */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "United States of America",
  us: "United States of America",
  "united states": "United States of America",
  america: "United States of America",
  uk: "United Kingdom",
  "great britain": "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",
  uae: "United Arab Emirates",
  korea: "South Korea",
  "republic of korea": "South Korea",
  "czech republic": "Czechia",
  holland: "Netherlands",
  "the netherlands": "Netherlands",
  "viet nam": "Vietnam",
  "bosnia and herzegovina": "Bosnia and Herz.",
  "dominican republic": "Dominican Rep.",
  "ivory coast": "Côte d'Ivoire",
  turkiye: "Turkey",
  burma: "Myanmar",
  bharat: "India",
};

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalizePlace(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const PLACE_INDEX = new Map<string, { lat: number; lng: number; country: string }>();
for (const [names, lat, lng, country] of PLACES) {
  for (const name of names.split("|")) PLACE_INDEX.set(normalizePlace(name), { lat, lng, country });
}

const COUNTRY_INDEX = new Map<string, { name: string; lat: number; lng: number }>();
for (const [name, coords] of Object.entries(centroids as Record<string, number[]>)) {
  const [lat, lng] = coords;
  if (lat !== undefined && lng !== undefined)
    COUNTRY_INDEX.set(normalizePlace(name), { name, lat, lng });
}
for (const [alias, name] of Object.entries(COUNTRY_ALIASES)) {
  const hit = COUNTRY_INDEX.get(normalizePlace(name));
  if (hit) COUNTRY_INDEX.set(normalizePlace(alias), hit);
}

export function resolveCountry(name: string | null | undefined) {
  if (!name) return null;
  return COUNTRY_INDEX.get(normalizePlace(name)) ?? null;
}

/**
 * Resolve a place name (optionally with the country the journey states).
 * Tries the full name, then its first comma-separated part ("Manali, Himachal").
 * A stated country that contradicts the matched place wins — the point falls
 * back to that country's centroid instead of landing in the wrong country.
 */
export function resolvePlace(
  name: string | null | undefined,
  country?: string | null,
): ResolvedPlace | null {
  const stated = resolveCountry(country);

  if (name) {
    const candidates = [normalizePlace(name), normalizePlace(name.split(",")[0] ?? "")];
    for (const key of candidates) {
      if (!key) continue;
      const place = PLACE_INDEX.get(key);
      if (place && (!stated || stated.name === place.country)) {
        return { lat: place.lat, lng: place.lng, precision: "place", country: place.country };
      }
      const asCountry = COUNTRY_INDEX.get(key);
      if (asCountry && (!stated || stated.name === asCountry.name)) {
        return {
          lat: asCountry.lat,
          lng: asCountry.lng,
          precision: "country",
          country: asCountry.name,
        };
      }
    }
  }

  return stated
    ? { lat: stated.lat, lng: stated.lng, precision: "country", country: stated.name }
    : null;
}

/** Exposed for tests: every country named in the place table must exist. */
export const __placeCountries = [...new Set(PLACES.map((p) => p[3]))];
