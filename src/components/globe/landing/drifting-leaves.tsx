import type { CSSProperties } from "react";

import { LeafIcon } from "./leaf";

/**
 * Leaves caught on the wind, drifting from the lower left of the hero up
 * toward the globe — the page's "journey" motif in its quietest form. Pure CSS
 * (no JavaScript). Negative delays put them mid-flight from the first paint;
 * under reduced motion the animation collapses and they stay hidden.
 */
const LEAVES: {
  left: string;
  top: string;
  size: number;
  dur: number;
  delay: number;
  path: string;
  leaf: number;
}[] = [
  { left: "2%", top: "88%", size: 18, dur: 17, delay: -2, path: "a", leaf: 1 },
  { left: "8%", top: "96%", size: 14, dur: 21, delay: -6, path: "b", leaf: 2 },
  { left: "-2%", top: "72%", size: 20, dur: 19, delay: -11, path: "c", leaf: 3 },
  { left: "12%", top: "90%", size: 12, dur: 23, delay: -4, path: "a", leaf: 4 },
  { left: "4%", top: "80%", size: 16, dur: 18, delay: -14, path: "b", leaf: 1 },
  { left: "16%", top: "98%", size: 15, dur: 20, delay: -9, path: "c", leaf: 2 },
  { left: "0%", top: "94%", size: 13, dur: 24, delay: -18, path: "a", leaf: 3 },
];

export function DriftingLeaves() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      {LEAVES.map((l, i) => (
        <span
          key={i}
          className="gl-leaf"
          style={
            {
              left: l.left,
              top: l.top,
              "--size": `${l.size}px`,
              "--dur": `${l.dur}s`,
              "--delay": `${l.delay}s`,
              "--path": `gl-drift-${l.path}`,
              "--leaf": `var(--gl-leaf-${l.leaf})`,
            } as CSSProperties
          }
        >
          <LeafIcon className="size-full" />
        </span>
      ))}
    </div>
  );
}
