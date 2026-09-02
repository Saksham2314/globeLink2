# ADR 0007 — Light / Dark theme switching

- **Status:** accepted
- **Date:** 2026-09-02
- **Scope:** a feature ask between Phase 4 and Phase 5, not a numbered phase.

## Context

Phases 0–4 already shipped a full dark palette in `src/styles/tokens.css` under
`@media (prefers-color-scheme: dark)`, and every component consumes semantic
Tailwind utilities (`bg-bg`, `text-ink`, `bg-surface`, `border-border`,
`text-danger`, …) — never a raw hex. Dark mode "worked" but only by following
the OS. This change adds an explicit **Light / Dark / System** switch.

## Decisions

### 1. No database field — localStorage only

A viewing preference for one browser doesn't belong in Postgres. Stored under
`localStorage["gl-theme"]` as `"light" | "dark" | "system"`. `src/lib/theme.ts`
is the single client-side helper (read / resolve / apply / persist).

### 2. Attribute-driven, not `dark:` variants

`tokens.css` gains two dark blocks:

- `:root[data-theme="dark"]` — the explicit choice.
- `@media (prefers-color-scheme: dark) { :root:not([data-theme]) }` — the OS
  default for JS-disabled visitors (JS users always get an explicit
  `data-theme`, so this block never double-fires).

The two lists are identical and kept in sync by hand — clarity over DRY for a
stylesheet, and it's the standard no-flash pattern. Components are untouched:
they already point at `--color-*` → `--gl-*`, which these selectors swap.
No `dark:` utilities anywhere. Added one semantic token, `--gl-ring` (focus),
which the base `:focus-visible` rule now uses.

### 3. No flash, no hydration mismatch

A tiny **parser-blocking inline script** in the root layout `<head>` reads
`gl-theme`, resolves `system` via `matchMedia`, and stamps
`<html data-theme>` + `style.color-scheme` **before `<body>` paints**. The
server renders `<html>` with no `data-theme` and `suppressHydrationWarning`
(already present); `ThemeControl` only shows an active option after `mounted`,
so its first client render matches the server's. `color-scheme` is also set so
native scrollbars / form controls match.

### 4. Where the switch lives

`ThemeControl` (a 3-way segmented control) sits in the **user menu** for
signed-in users and the **site footer** for everyone. It adds a
`data-theme-transition` attribute to `<html>` for ~220ms on change so colours
cross-fade once — never on first paint, and gated by `prefers-reduced-motion`.
A `matchMedia` listener keeps `System` mode live when the OS flips.

## Consequences

- Dark surface/border values were nudged a little lighter (`#141b25` →
  `#151d29`, etc.) for clearer card-vs-page layering in long sessions — same
  palette, not a redesign.
- `viewport.themeColor` stays media-based (browser-chrome only; out of scope
  for the desktop web experience).
- New files: `src/lib/theme.ts`, `src/components/globe/theme-control.tsx`.
