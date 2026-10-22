"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Gives its child a gentle 3D tilt toward the pointer, with a soft light
 * sheen. Only for a fine pointer with motion allowed — touch and reduced-motion
 * visitors get the flat card. Writes CSS variables directly (no React state).
 */
export function TiltCard({
  children,
  className,
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  /** Maximum tilt, in degrees. */
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useRef(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      enabled.current = fine.matches && !calm.matches;
    };
    update();
    calm.addEventListener("change", update);
    return () => calm.removeEventListener("change", update);
  }, []);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !enabled.current || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${((0.5 - py) * max).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((px - 0.5) * max).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    el.dataset.tilting = "";
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    delete el.dataset.tilting;
  };

  return (
    <div
      ref={ref}
      className={cn("gl-tilt", className)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
      <span aria-hidden className="gl-tilt-sheen" />
    </div>
  );
}
