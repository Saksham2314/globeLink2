"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";

// ssr: false — WebGL can't render on the server, and this keeps the whole
// three.js bundle out of the server-rendered HTML/initial client bundle.
const HeroGlobe = dynamic(() => import("./hero-globe").then((m) => m.HeroGlobe), {
  ssr: false,
});

/** A decorative 3D element must never be able to take the whole page down
 *  with it (a bad GLB, a WebGL context failure, …) — Suspense only covers the
 *  loading state, so a real render error needs an actual error boundary. */
class GlobeErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.error("HeroGlobe failed to render; hiding it.", error);
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Mounts the rotating globe only on large screens, confirmed client-side via
 * matchMedia — so phones/tablets never fetch the three.js chunk or the model
 * at all (not just hide an already-downloaded one with CSS).
 */
export function HeroGlobeLoader() {
  const [showOnThisViewport, setShowOnThisViewport] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setShowOnThisViewport(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  if (!showOnThisViewport) return null;

  return (
    <GlobeErrorBoundary>
      <HeroGlobe />
    </GlobeErrorBoundary>
  );
}
