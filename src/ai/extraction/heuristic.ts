/**
 * Cheap gate: is this search text worth sending to the model, or is it just a
 * keyword the deterministic search already handles well? Keeps the common case
 * (one or two words) free.
 */

const HINTS =
  /\b(day|days|week|weeks|night|nights|budget|under|below|over|around|cheap|luxury|relax|relaxed|slow|family|solo|couple|friends|honeymoon|adventure|backpack\w*|trip|holiday|vacation|itinerary|near|with|and|for)\b/i;

const MONEY = /[₹$€£]|\b\d{3,}\b|\bk\b/i;

export function looksLikeNaturalLanguageQuery(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length >= 4) return true;
  if (words.length >= 2 && (MONEY.test(t) || HINTS.test(t))) return true;
  return false;
}
