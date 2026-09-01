"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/**
 * Shared scroll-reveal primitives, built on the project's animation library
 * (motion / Framer Motion). Only `opacity` and `transform` are animated, so a
 * reveal never triggers layout, never repaints siblings, and never shifts the
 * page — the element occupies its final box from first paint and only its
 * visibility changes.
 *
 *   <Reveal>                    one element fading + rising into view
 *   <RevealGroup> / <RevealItem>  a container whose children reveal in sequence
 *
 * When the visitor prefers reduced motion, every component collapses to a plain
 * `<div>` that is fully visible immediately. A `<noscript>` rule in the root
 * layout does the same when JavaScript is unavailable.
 */

// Gentle ease-out, no overshoot — reads as "settling into place".
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const DURATION = 0.55;
const DISTANCE = 16; // px of upward travel

// Start the animation a little before the element is fully on screen.
const VIEWPORT_MARGIN = "0px 0px -12% 0px" as const;

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Extra delay before this element starts, in seconds. */
  delay?: number;
  /**
   * `true`  (default) reveal once, then stay visible.
   * `false` also animate back out as the element leaves the viewport, and
   *         re-reveal on the way back — used sparingly for headline elements.
   */
  once?: boolean;
}

export function Reveal({ children, className, delay = 0, once = true }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      data-reveal
      initial={{ opacity: 0, y: DISTANCE }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: VIEWPORT_MARGIN }}
      transition={{ duration: DURATION, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.04 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: DISTANCE },
  show: { opacity: 1, y: 0, transition: { duration: DURATION, ease: EASE } },
};

interface RevealGroupProps {
  children: ReactNode;
  className?: string;
  once?: boolean;
}

/**
 * Wraps a set of `<RevealItem>`s and reveals them one after another as the
 * group scrolls into view. Put layout classes (`grid`, `flex`…) on `className`
 * — the group renders the real container element.
 */
export function RevealGroup({ children, className, once = true }: RevealGroupProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: VIEWPORT_MARGIN }}
      variants={containerVariants}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} data-reveal variants={itemVariants}>
      {children}
    </motion.div>
  );
}
