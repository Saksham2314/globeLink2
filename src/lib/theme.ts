/**
 * Theme preference: light / dark / system. Persisted per-browser in
 * localStorage (no server field — a viewing preference doesn't belong in the
 * database). The resolved value is reflected on `<html data-theme>` and
 * `<html style="color-scheme">`.
 *
 * First paint is handled by an inline script in the root layout that reads the
 * same key BEFORE the body renders, so there is no flash of the wrong theme.
 * Keep the key below in sync with that script.
 */

export const THEME_STORAGE_KEY = "gl-theme";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: ThemePreference[] = ["light", "dark", "system"];

export function getStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
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

/** Persist a preference and apply it. Returns the resolved theme. */
export function setThemePreference(pref: ThemePreference): ResolvedTheme {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // ignore — the in-memory apply below still works for this session
  }
  const resolved = resolvePreference(pref);
  applyResolvedTheme(resolved);
  return resolved;
}
