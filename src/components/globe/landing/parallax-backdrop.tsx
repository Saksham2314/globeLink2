"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useRef } from "react";

/**
 * A full-bleed background photo that moves slower than the page (depth).
 * Static under reduced motion.
 */
export function ParallaxBackdrop({ src }: { src: string }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);

  return (
    <div ref={ref} aria-hidden className="absolute inset-0 -z-20 overflow-hidden">
      <motion.div
        className="absolute inset-x-0 -inset-y-[14%]"
        style={reduceMotion ? undefined : { y }}
      >
        <Image src={src} alt="" fill sizes="100vw" className="object-cover" />
      </motion.div>
    </div>
  );
}
