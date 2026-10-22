/**
 * The three destinations in the "letting go" scene. Plain data in its own
 * module so both the client scene and the server page can import it (a
 * Server Component can't read non-component exports from a "use client" file).
 */
export const JOURNEY_PINS = [
  { x: 800, y: 318, label: "Leave the familiar" },
  { x: 968, y: 214, label: "Go see it for yourself" },
  { x: 1112, y: 380, label: "Come back with a story" },
] as const;

export const JOURNEY_STEPS = JOURNEY_PINS.map((p) => p.label);
