"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  getStoredPreference,
  resolvePreference,
  setThemePreference,
  applyResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";
import { saveThemePreferenceAction } from "@/modules/users/user.actions";

const OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Light", icon: <SunIcon /> },
  { value: "dark", label: "Dark", icon: <MoonIcon /> },
  { value: "system", label: "System", icon: <MonitorIcon /> },
];

const TRANSITION_MS = 220;

export function ThemeControl({ variant = "menu" }: { variant?: "menu" | "inline" }) {
  const [mounted, setMounted] = useState(false);
  const [pref, setPref] = useState<ThemePreference>("system");
  const prefRef = useRef(pref);
  prefRef.current = pref;

  useEffect(() => {
    setPref(getStoredPreference());
    setMounted(true);
  }, []);

  // Keep in step with the OS while the preference is "system".
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (prefRef.current === "system") applyResolvedTheme(resolvePreference("system"));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function choose(next: ThemePreference) {
    const root = document.documentElement;
    root.setAttribute("data-theme-transition", "");
    window.setTimeout(() => root.removeAttribute("data-theme-transition"), TRANSITION_MS);

    setThemePreference(next);
    setPref(next);
    void saveThemePreferenceAction(next);
  }

  return (
    <div className={variant === "menu" ? "px-2.5 py-2" : undefined}>
      {variant === "menu" ? <p className="text-muted mb-1.5 text-xs font-medium">Theme</p> : null}
      <div
        role="radiogroup"
        aria-label="Theme"
        className="bg-surface-muted flex w-full gap-0.5 rounded-md p-0.5"
      >
        {OPTIONS.map((opt) => {
          const active = mounted && pref === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              title={opt.label}
              onClick={() => choose(opt.value)}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-1 rounded px-1 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors",
                active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              <span className="shrink-0">{opt.icon}</span>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}
