/** Pure slug helper — safe to import anywhere. DB-backed uniqueness lives in
 *  journey.slug.server.ts. */

/** Lowercase, hyphenated, ASCII-ish slug capped at 60 chars. */
export function slugifyTitle(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");
}
