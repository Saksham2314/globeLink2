/**
 * When each destination marker pops in, measured in seconds since the globe
 * became ready. Every marker's start is spread across one fixed window, so all
 * of them appear no matter how many there are — earlier the delay grew with
 * the marker's index past the end of the intro, leaving later ones invisible
 * (and unclickable).
 */
export const MARKER_INTRO_START = 0.45;
export const MARKER_STAGGER_WINDOW = 0.75;
export const MARKER_POP_SECONDS = 0.45;

export function markerDelay(index: number, count: number): number {
  const spread = count > 1 ? index / (count - 1) : 0;
  return MARKER_INTRO_START + Math.min(1, Math.max(0, spread)) * MARKER_STAGGER_WINDOW;
}

/** 0 → 1 progress of marker `index`'s pop-in at `elapsed` seconds. */
export function markerAppear(elapsed: number, index: number, count: number): number {
  return Math.min(1, Math.max(0, (elapsed - markerDelay(index, count)) / MARKER_POP_SECONDS));
}

/** By this time every marker is fully visible. */
export const MARKERS_SETTLED_AT = MARKER_INTRO_START + MARKER_STAGGER_WINDOW + MARKER_POP_SECONDS;
