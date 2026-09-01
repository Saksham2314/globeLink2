/**
 * Handle rules — pure, safe to import from client or server code.
 * The DB-backed uniqueness generator lives in `handle.server.ts`.
 */

/** URL-safe handle: lowercase a–z, 0–9 and single hyphens, 3–20 chars. */
export const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,18}[a-z0-9])$/;

export const RESERVED_HANDLES = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "explore",
  "settings",
  "login",
  "signup",
  "profile",
  "assistant",
  "messages",
  "saved",
  "journeys",
  "new",
  "me",
]);

/** Best-effort slug from an arbitrary string (name or email local-part). */
export function slugifyHandle(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 20);
}

export function isHandleAvailableShape(handle: string): boolean {
  return HANDLE_PATTERN.test(handle) && !RESERVED_HANDLES.has(handle);
}
