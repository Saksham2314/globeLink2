"use client";

import { useEffect } from "react";

import { getStoredPreference, setThemePreference, type ThemePreference } from "@/lib/theme";

/**
 * Reconciles this device with the signed-in user's saved theme. On a device
 * the user hasn't set a theme on (no cookie / localStorage), the server value
 * wins, so the choice follows them across devices. When the local value already
 * matches, this is a no-op and nothing flashes.
 */
export function ThemeSync({ serverPref }: { serverPref: ThemePreference | null }) {
  useEffect(() => {
    if (!serverPref) return;
    if (getStoredPreference() !== serverPref) setThemePreference(serverPref);
  }, [serverPref]);

  return null;
}
