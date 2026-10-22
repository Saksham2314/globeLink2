"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import type { AtlasArc, AtlasDestination } from "@/modules/atlas/atlas.types";

import { DestinationPreview } from "./destination-preview";
import type { GlobeScene, GlobeTheme } from "./globe-scene";

interface AtlasExperienceProps {
  destinations: AtlasDestination[];
  arcs: AtlasArc[];
  viewerCanSave: boolean;
}

// --- theme: follow the existing `data-theme` attribute (no second theme state)
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const DESKTOP_QUERY = "(min-width: 1024px)";
function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const readDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;

const readTheme = (): GlobeTheme =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

type Status = "loading" | "ready" | "failed";

/**
 * The interactive globe island of the landing hero. Everything around it is
 * server-rendered; this owns only what is genuinely interactive: which
 * destination is hovered / focused / selected, and the preview panel. The
 * three.js scene is loaded lazily (its own chunk) and never blocks the page —
 * a static globe shows until it is ready, and stays if WebGL is unavailable.
 */
export function AtlasExperience({ destinations, arcs, viewerCanSave }: AtlasExperienceProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "dark" as GlobeTheme);
  const isDesktop = useSyncExternalStore(subscribeDesktop, readDesktop, () => false);

  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sceneRef = useRef<GlobeScene | null>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());
  const moveFocusOnOpen = useRef(false);

  const [status, setStatus] = useState<Status>("loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(destinations.map((d) => [d.id, d])), [destinations]);
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;

  const select = useCallback((id: string, viaKeyboardOrList: boolean) => {
    moveFocusOnOpen.current = viaKeyboardOrList;
    setSelectedId(id);
  }, []);

  // Latest values for callbacks that outlive a render (the scene, key handlers).
  const latest = useRef({ selectedId, reduceMotion });
  useEffect(() => {
    latest.current = { selectedId, reduceMotion };
  });

  const close = useCallback(() => {
    const current = latest.current.selectedId;
    setSelectedId(null);
    // Return focus to the destination's list entry — its accessible twin.
    if (current) itemRefs.current.get(current)?.focus({ preventScroll: true });
  }, []);

  // ---- mount the scene once; React state flows in through the effects below
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (!webglAvailable()) {
      setStatus("failed");
      return;
    }

    let cancelled = false;
    let scene: GlobeScene | null = null;
    const lite = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;

    import("./globe-scene")
      .then(({ GlobeScene }) => {
        if (cancelled) return;
        scene = new GlobeScene({
          host,
          textureUrl: lite ? "/textures/earth-atlas-2048.webp" : "/textures/earth-atlas-4096.webp",
          markers: destinations.map(({ id, lat, lng }) => ({ id, lat, lng })),
          arcs,
          theme: readTheme(),
          reducedMotion: latest.current.reduceMotion,
          lite,
          onReady: () => setStatus("ready"),
          onError: () => setStatus("failed"),
          onHover: (id) => setHoveredId(id),
          onPick: (id) => select(id, false),
        });
        sceneRef.current = scene;
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });

    return () => {
      cancelled = true;
      scene?.dispose();
      sceneRef.current = null;
    };
    // The scene is built from server data that doesn't change on this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => sceneRef.current?.setTheme(theme), [theme, status]);
  useEffect(() => sceneRef.current?.setReducedMotion(reduceMotion), [reduceMotion, status]);
  // Wide layouts: keep the selected place up-left of the side panel. Narrow:
  // lift it above the bottom sheet.
  useEffect(
    () =>
      sceneRef.current?.setSelected(
        selectedId,
        isDesktop ? { yaw: -0.5, pitch: -0.12 } : { yaw: 0, pitch: -0.32 },
      ),
    [selectedId, isDesktop, status],
  );
  useEffect(
    () => sceneRef.current?.setHighlight(hoveredId ?? focusedId),
    [hoveredId, focusedId, status],
  );

  const labelId = hoveredId ?? focusedId ?? selectedId;
  const labelName = labelId ? (byId.get(labelId)?.name ?? "") : "";
  useEffect(() => sceneRef.current?.setLabelTarget(labelId, labelRef.current), [labelId, status]);

  // ---- open/close behaviour
  useEffect(() => {
    if (selectedId && moveFocusOnOpen.current) headingRef.current?.focus({ preventScroll: true });
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId, close]);

  // ---- scroll: the globe recedes as the hero scrolls away (motion values —
  // no React re-renders). Off entirely for reduced motion.
  const { scrollYProgress } = useScroll({ target: stageRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.86]);
  const opacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.3]);

  const onItemClick = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    // Modified clicks keep the link's real behaviour (open Explore in a tab).
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (selectedId === id) close();
    else select(id, true);
  };

  return (
    <div className="relative">
      <div
        ref={stageRef}
        className="gl-globe-stage relative mx-auto aspect-square w-full max-w-[36rem] lg:aspect-auto lg:h-[min(54rem,calc(100svh-6rem))] lg:max-w-none"
      >
        <motion.div
          className="absolute inset-0"
          style={reduceMotion ? undefined : { y, scale, opacity }}
        >
          <div
            aria-hidden
            className={cn(
              "gl-globe-fallback transition-opacity duration-700",
              status === "ready" && "opacity-0",
            )}
          />
          <div
            ref={hostRef}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-out",
              status === "ready" ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            ref={labelRef}
            aria-hidden
            className="border-border bg-surface/90 text-ink pointer-events-none absolute top-0 left-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap opacity-0 shadow-sm backdrop-blur transition-opacity duration-150"
          >
            {labelName}
          </div>
        </motion.div>

        {selected && isDesktop ? (
          <DestinationPreview
            ref={headingRef}
            destination={selected}
            viewerCanSave={viewerCanSave}
            onClose={close}
            className="absolute right-0 bottom-4 z-20 max-h-[calc(100%-2rem)] w-[24rem] overflow-hidden rounded-xl border"
          />
        ) : null}
        {/* Narrow screens: a bottom sheet, portalled to <body> so no ancestor
            stacking context (the hero is `isolate`) can paint over it. It
            re-enters `.gl-landing` so it keeps the landing palette. */}
        {selected && !isDesktop
          ? createPortal(
              <div className="gl-landing">
                <DestinationPreview
                  ref={headingRef}
                  destination={selected}
                  viewerCanSave={viewerCanSave}
                  onClose={close}
                  className="fixed inset-x-0 bottom-0 z-50 max-h-[82svh] overflow-hidden rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)]"
                />
              </div>,
              document.body,
            )
          : null}
      </div>

      <DestinationList
        destinations={destinations}
        selectedId={selectedId}
        itemRefs={itemRefs.current}
        onItemClick={onItemClick}
        onFocusItem={setFocusedId}
        onHoverItem={setHoveredId}
      />
    </div>
  );
}

function DestinationList({
  destinations,
  selectedId,
  itemRefs,
  onItemClick,
  onFocusItem,
  onHoverItem,
}: {
  destinations: AtlasDestination[];
  selectedId: string | null;
  itemRefs: Map<string, HTMLAnchorElement>;
  onItemClick: (e: MouseEvent<HTMLAnchorElement>, id: string) => void;
  onFocusItem: (id: string | null) => void;
  onHoverItem: (id: string | null) => void;
}) {
  return (
    <div className="relative z-10 mt-2 lg:absolute lg:bottom-6 lg:left-0 lg:mt-0">
      <p
        id="atlas-list-label"
        className="text-muted text-[11px] font-semibold tracking-[0.16em] uppercase"
      >
        On the globe
      </p>
      {destinations.length ? (
        <ul aria-labelledby="atlas-list-label" className="mt-2.5 flex flex-wrap gap-2">
          {destinations.map((d) => {
            const n = d.journeys.length;
            const active = selectedId === d.id;
            return (
              <li key={d.id}>
                <a
                  ref={(el) => {
                    if (el) itemRefs.set(d.id, el);
                    else itemRefs.delete(d.id);
                  }}
                  href={d.exploreHref}
                  aria-expanded={active}
                  aria-controls={active ? "atlas-preview" : undefined}
                  onClick={(e) => onItemClick(e, d.id)}
                  onFocus={() => onFocusItem(d.id)}
                  onBlur={() => onFocusItem(null)}
                  onMouseEnter={() => onHoverItem(d.id)}
                  onMouseLeave={() => onHoverItem(null)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors",
                    active
                      ? "border-gold-line bg-surface text-ink"
                      : "border-border-strong bg-surface/70 text-ink/90 hover:bg-surface hover:text-ink",
                  )}
                >
                  <span aria-hidden className="bg-gold-line size-1.5 rounded-full" />
                  {d.name}
                  <span className="text-muted text-xs">
                    {n} {n === 1 ? "journey" : "journeys"}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted mt-2 max-w-sm text-sm">
          Destinations appear here as travellers publish the journeys they&rsquo;ve taken.
        </p>
      )}
    </div>
  );
}
