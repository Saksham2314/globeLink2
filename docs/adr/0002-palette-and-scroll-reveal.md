# ADR 0002 — Cool blue palette + scroll-reveal system

- **Status:** accepted
- **Date:** 2026-09-01
- **Supersedes:** the accent-colour decision in ADR 0001 §4 (terracotta).
- **Context:** landing-page polish pass before Phase 1. No feature work.

## Decisions

### 1. Palette direction — cool / atmospheric blue

The terracotta / warm-paper palette from ADR 0001 was rejected. New direction:
deep muted navy-blue accent, blue-grey text, cool off-white surfaces; premium
and atmospheric rather than bright "corporate blue", and not gradient-heavy.

| Role                        | Light                 | Dark                  |
| --------------------------- | --------------------- | --------------------- |
| `bg`                        | `#f5f7f9`             | `#0d1219`             |
| `surface` / `surface-muted` | `#ffffff` / `#eaeef3` | `#141b25` / `#1c2530` |
| `border` / `border-strong`  | `#dfe4ea` / `#c7d0db` | `#263140` / `#354354` |
| `ink` / `muted`             | `#17202e` / `#586273` | `#e8ecf2` / `#97a2b2` |
| `accent` / `accent-hover`   | `#2f4d70` / `#26405d` | `#7ba4cc` / `#93b6d9` |
| `accent-soft`               | `#e6ecf3`             | `#172231`             |

All values live as `--gl-*` custom properties in `src/styles/tokens.css` and are
bridged to Tailwind utilities via `@theme inline` in `src/app/globals.css`.
Changing the palette later means editing one file. Shadows were re-tinted cool
(`rgba(15, 23, 35, …)`). `icon.svg` and the layout `themeColor` were updated to
match.

### 2. Scroll-reveal system

Library: **`motion`** (Framer Motion, `motion/react`) — the animation library
already named in `docs/ARCHITECTURE.md`. No second library.

Primitives in `src/components/motion/reveal.tsx`:

- `Reveal` — a single element fades in (opacity 0 → 1) and rises 16px into place.
- `RevealGroup` / `RevealItem` — a container whose children reveal in sequence
  (stagger 90ms) via motion variants.

Rules baked in:

- Only `opacity` and `transform` animate — never layout properties — so a reveal
  cannot cause layout shift. The element holds its final box from first paint.
- Duration 0.55s, ease `[0.22, 1, 0.36, 1]` (soft ease-out, no overshoot).
- Trigger via `whileInView` with a `-12%` bottom viewport margin (starts just
  before the element is fully on screen). Works with normal wheel scrolling.
- `once` prop: default `true` (reveal once, stay). `once={false}` is used only on
  headline elements (hero block, section `<h2>`s) so they also ease back out as
  they leave the viewport and re-reveal on return.
- `useReducedMotion()` → every primitive renders plain `<div>`, fully visible.
- `<noscript>` rule in the root layout forces `[data-reveal]` visible when JS is
  unavailable.

## Consequences

- `/` stays statically prerenderable; the reveal components are client islands.
- First Load JS for `/` grew ~40 kB (the `motion` runtime), code-split into the
  route chunk. Acceptable for the landing experience; revisit if it spreads.
