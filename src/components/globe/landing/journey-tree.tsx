"use client";

import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

import { JOURNEY_PINS } from "./journey-steps";
import { LEAF_PATH, LEAF_VEIN } from "./leaf";

/**
 * "Every journey starts by letting go": a tree sheds its leaves as the visitor
 * scrolls, and each leaf drifts along the wind to somewhere new on the right.
 *
 * All geometry is precomputed from a seeded PRNG so server and client render
 * identically. A single scroll subscription moves every leaf through refs —
 * scrolling never re-renders React. Without JS, or under reduced motion, the
 * scene is a still, mid-shed illustration.
 */

const W = 1200;
const H = 560;
const STATIC_PROGRESS = 0.5;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PINS = JOURNEY_PINS;

interface LeafSpec {
  sx: number;
  sy: number;
  rot0: number;
  scale: number;
  color: number;
  // flight (only for leaves that detach)
  flies: boolean;
  t0: number;
  c1: [number, number];
  c2: [number, number];
  end: [number, number];
  spin: number;
  flutter: number;
  sway: number;
}

const LEAVES: LeafSpec[] = (() => {
  const rand = mulberry32(20261022);
  const out: LeafSpec[] = [];
  const total = 58;
  let flying = 0;
  for (let i = 0; i < total; i++) {
    // Canopy: an ellipse above the trunk, denser at the crown.
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    const sx = 222 + Math.cos(a) * r * 165;
    const sy = 168 + Math.sin(a) * r * 92 - (1 - r) * 18;
    const flies = rand() < 0.55;
    const pin = PINS[Math.floor(rand() * PINS.length)]!;
    const end: [number, number] = [pin.x + (rand() - 0.5) * 110, pin.y + 18 + rand() * 46];
    out.push({
      sx,
      sy,
      rot0: (rand() - 0.5) * 140,
      scale: 0.75 + rand() * 0.55,
      color: 1 + Math.floor(rand() * 4),
      flies,
      t0: 0,
      c1: [sx + 160 + rand() * 120, sy - 110 - rand() * 90],
      c2: [end[0] - 200 - rand() * 120, end[1] - 170 - rand() * 80],
      end,
      spin: (220 + rand() * 320) * (rand() < 0.5 ? -1 : 1),
      flutter: 2 + rand() * 2.5,
      sway: rand() * 4,
    });
    if (flies) flying++;
  }
  // Staggered departures: leaf k leaves at an evenly spread scroll point.
  let k = 0;
  for (const l of out) {
    if (!l.flies) continue;
    l.t0 = 0.02 + (k / Math.max(1, flying - 1)) * 0.52;
    k++;
  }
  return out;
})();

const SPAN = 0.4;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

function bezier(p0: number, p1: number, p2: number, p3: number, t: number) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function leafTransform(l: LeafSpec, progress: number): string {
  if (!l.flies) {
    return `translate(${l.sx.toFixed(1)} ${l.sy.toFixed(1)}) rotate(${l.rot0.toFixed(1)}) scale(${l.scale.toFixed(2)})`;
  }
  const t = ease(clamp01((progress - l.t0) / SPAN));
  const wob = Math.sin(t * Math.PI * l.flutter) * (1 - t) * 16;
  const x = bezier(l.sx, l.c1[0], l.c2[0], l.end[0], t) + wob * 0.4;
  const y = bezier(l.sy, l.c1[1], l.c2[1], l.end[1], t) + wob;
  const rot = l.rot0 + l.spin * t + wob * 1.5;
  const s = l.scale * (1 - 0.22 * t);
  return `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${s.toFixed(2)})`;
}

const routeTo = (p: { x: number; y: number }) =>
  `M 330 150 C ${430} ${60}, ${p.x - 220} ${p.y - 180}, ${p.x} ${p.y}`;

const routeOffset = (i: number, progress: number) =>
  (1 - clamp01((progress - 0.08 - i * 0.12) / 0.45)).toFixed(3);

const captionOpacity = (i: number, progress: number) =>
  clamp01((progress - (0.18 + i * 0.17)) / 0.12).toFixed(3);

export function JourneyTree() {
  const reduceMotion = useReducedMotion();
  const sceneRef = useRef<HTMLDivElement>(null);
  const leafRefs = useRef<(SVGGElement | null)[]>([]);
  const routeRefs = useRef<(SVGPathElement | null)[]>([]);
  const captionRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const { scrollYProgress } = useScroll({ target: sceneRef, offset: ["start 0.92", "end 0.3"] });

  const apply = useCallback((v: number) => {
    LEAVES.forEach((l, i) => {
      if (l.flies) leafRefs.current[i]?.setAttribute("transform", leafTransform(l, v));
    });
    routeRefs.current.forEach((el, i) => el?.setAttribute("stroke-dashoffset", routeOffset(i, v)));
    captionRefs.current.forEach((el, i) => {
      if (el) el.style.opacity = captionOpacity(i, v);
    });
  }, []);

  // Sync to the real scroll position once mounted (the server HTML shows the
  // static pose), then follow scrolling.
  useEffect(() => {
    if (reduceMotion === false) apply(scrollYProgress.get());
  }, [reduceMotion, apply, scrollYProgress]);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (reduceMotion === false) apply(v);
  });

  return (
    <div ref={sceneRef} className="relative mx-auto aspect-[1200/560] w-full max-w-6xl">
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
        {/* ground — fades out at both ends so the scene has no hard edges */}
        <defs>
          <linearGradient id="gl-ground-fade" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" style={{ stopColor: "var(--gl-ground)", stopOpacity: 0 }} />
            <stop offset="0.12" style={{ stopColor: "var(--gl-ground)", stopOpacity: 1 }} />
            <stop offset="0.88" style={{ stopColor: "var(--gl-ground)", stopOpacity: 1 }} />
            <stop offset="1" style={{ stopColor: "var(--gl-ground)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path
          d={`M0 522 C 260 494, 520 546, 820 512 S 1100 498, ${W} 508 L ${W} ${H} L 0 ${H} Z`}
          fill="url(#gl-ground-fade)"
        />

        {/* routes the leaves follow */}
        {PINS.map((p, i) => (
          <g key={i}>
            <path
              d={routeTo(p)}
              fill="none"
              stroke="var(--gl-gold-line)"
              strokeOpacity="0.3"
              strokeWidth="1.5"
              strokeDasharray="3 9"
              strokeLinecap="round"
            />
            <path
              ref={(el) => {
                routeRefs.current[i] = el;
              }}
              d={routeTo(p)}
              fill="none"
              stroke="var(--gl-gold-line)"
              strokeOpacity="0.75"
              strokeWidth="1.6"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={routeOffset(i, STATIC_PROGRESS)}
            />
            <circle cx={p.x} cy={p.y} r="5" fill="var(--gl-gold-line)" />
            <circle
              cx={p.x}
              cy={p.y}
              r="11"
              fill="none"
              stroke="var(--gl-gold-line)"
              strokeOpacity="0.5"
              className="gl-pin-pulse"
            />
          </g>
        ))}

        {/* tree */}
        <g fill="none" stroke="var(--gl-bark)" strokeLinecap="round">
          <path d="M212 300 C 180 270, 150 252, 112 238" strokeWidth="10" />
          <path d="M214 272 C 250 240, 286 224, 332 216" strokeWidth="9" />
          <path d="M216 250 C 205 204, 190 172, 166 140" strokeWidth="7" />
          <path d="M218 250 C 238 200, 262 170, 294 148" strokeWidth="7" />
          <path d="M218 252 C 220 200, 222 150, 226 98" strokeWidth="6" />
          <path d="M140 250 C 120 224, 98 214, 70 210" strokeWidth="4" />
          <path d="M302 220 C 320 198, 342 190, 368 188" strokeWidth="4" />
          <path d="M178 154 C 168 128, 150 114, 130 106" strokeWidth="3" />
          <path d="M282 156 C 296 130, 318 120, 342 116" strokeWidth="3" />
          <path d="M224 120 C 210 96, 196 84, 178 78" strokeWidth="2.5" />
          <path d="M226 112 C 242 90, 258 82, 278 78" strokeWidth="2.5" />
        </g>
        <path
          d="M194 522 C 200 452, 192 402, 205 342 C 213 304, 206 274, 212 244 L 226 244 C 222 278, 230 304, 224 346 C 216 402, 228 452, 236 522 Z"
          fill="var(--gl-bark)"
        />

        {/* leaves */}
        {LEAVES.map((l, i) => (
          <g
            key={i}
            ref={(el) => {
              leafRefs.current[i] = el;
            }}
            transform={leafTransform(l, STATIC_PROGRESS)}
          >
            <g
              className={l.flies ? undefined : "gl-sway"}
              style={l.flies ? undefined : { animationDelay: `${-l.sway}s` }}
            >
              <path d={LEAF_PATH} fill={`var(--gl-leaf-${l.color})`} />
              <path d={LEAF_VEIN} stroke="rgba(0,0,0,0.18)" strokeWidth="0.9" fill="none" />
            </g>
          </g>
        ))}
      </svg>

      {/* captions, over the destination pins (wide screens only) */}
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        {PINS.map((p, i) => (
          <p
            key={p.label}
            ref={(el) => {
              captionRefs.current[i] = el;
            }}
            className="text-ink absolute -translate-x-1/2 text-sm font-medium whitespace-nowrap"
            style={{
              left: `${(p.x / W) * 100}%`,
              top: `${((p.y - 46) / H) * 100}%`,
            }}
          >
            {p.label}
          </p>
        ))}
      </div>
    </div>
  );
}
