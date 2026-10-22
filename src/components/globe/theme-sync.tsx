"use client";

import { useEffect } from "react";

import {
  readStoredPreference,
  setThemePreference,
  themeToAdopt,
  type ThemePreference,
} from "@/lib/theme";

/**
 * Reconciles this device with the signed-in user's saved theme. Only a device
 * that has never chosen adopts the account's theme (so it follows the user to
 * new devices); a choice made here always wins — see `themeToAdopt`.
 */
export function ThemeSync({ serverPref }: { serverPref: ThemePreference | null }) {
  useEffect(() => {
    const adopt = themeToAdopt(readStoredPreference(), serverPref);
    if (adopt) setThemePreference(adopt);
  }, [serverPref]);

  return null;
}
