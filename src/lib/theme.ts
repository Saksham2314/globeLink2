/**
 * Theme preference: light / dark / system.
 *
 * Stored three ways, in priority order: a `gl-theme` cookie (so the no-flash
 * script and server can read it, and it survives across the same browser), and
 * `localStorage` as a mirror. For a signed-in user it is also saved to
 * `TravelPreference.theme` so the choice follows them to other devices — see
 * `saveThemePreferenceAction` and `<ThemeSync>`.
 *
 * The resolved value is reflected on `<html data-theme>` /
 * `<html style="color-scheme">`. First paint is handled by an inline script in
 * the root layout that reads the same cookie/key BEFORE the body renders —
 * keep it in sync with the constant below.
 */

export const THEME_STORAGE_KEY = "gl-theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: ThemePreference[] = ["light", "dark", "system"];

function isPref(v: unknown): v is ThemePreference {
  return v === "light" || v === "dark" || v === "system";
}

function cookiePreference(): ThemePreference | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)gl-theme=(light|dark|system)\b/);
  return match && isPref(match[1]) ? match[1] : null;
}

function writeCookie(pref: ThemePreference): void {
  try {
    document.cookie = `${THEME_STORAGE_KEY}=${pref}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    // ignore
  }
}

export function getStoredPreference(): ThemePreference {
  const fromCookie = cookiePreference();
  if (fromCookie) return fromCookie;
  if (typeof window === "undefined") return "system";
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isPref(value)) return value;
  } catch {
    // storage unavailable (private mode, blocked) — fall through
  }
  return "system";
}

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolvePreference(pref: ThemePreference): ResolvedTheme {
  return pref === "system" ? systemTheme() : pref;
}

/** Reflect a resolved theme onto the document. Runs on the client only. */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

/** Persist a preference (cookie + localStorage) and apply it. Returns the
 *  resolved theme. Server sync for signed-in users is a separate best-effort
 *  call (`saveThemePreferenceAction`). */
export function setThemePreference(pref: ThemePreference): ResolvedTheme {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // ignore — the cookie + in-memory apply below still work
  }
  writeCookie(pref);
  const resolved = resolvePreference(pref);
  applyResolvedTheme(resolved);
  return resolved;
}
