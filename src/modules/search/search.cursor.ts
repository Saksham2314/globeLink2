/**
 * Keyset pagination cursor.
 *
 * Every sort is reduced to one ascending numeric `k` (smaller = earlier in the
 * results) plus the row `id` as a tiebreak, so a single cursor shape and a
 * single `WHERE (k, id) > (?, ?)` pattern cover all sort modes.
 */
export interface Cursor {
  k: number;
  i: string;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify([c.k, c.i])).toString("base64url");
}

export function decodeCursor(raw: string | undefined | null): Cursor | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      Array.isArray(parsed) &&
      typeof parsed[0] === "number" &&
      Number.isFinite(parsed[0]) &&
      typeof parsed[1] === "string"
    ) {
      return { k: parsed[0], i: parsed[1] };
    }
  } catch {
    // malformed cursor → start from the top
  }
  return null;
}
