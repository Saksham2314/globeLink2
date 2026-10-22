"use client";

import { useEffect } from "react";

import {
  applyStoredTheme,
  getStoredPreference,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

/**
 * Keeps every page showing this device's chosen theme. Mounted once in the
 * root layout, so it covers every route:
 * - re-applies the stored choice on mount (any page, any entry point);
 * - follows a change made in another tab (`storage` event);
 * - re-applies when a page is restored from the back/forward cache;
 * - tracks the OS setting while the choice is "system".
 */
export function ThemeWatcher() {
  useEffect(() => {
    applyStoredTheme();

    const announce = () =>
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: getStoredPreference() }));

    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      applyStoredTheme();
      announce();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) applyStoredTheme();
    };
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onOsChange = () => {
      if (getStoredPreference() === "system") applyStoredTheme();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    mq.addEventListener("change", onOsChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
      mq.removeEventListener("change", onOsChange);
    };
  }, []);

  return null;
}
