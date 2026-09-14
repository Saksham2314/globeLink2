"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/** public/models/earth.glb — see public/models/README.md for provenance/size notes. */
const MODEL_URL = "/models/earth.glb";

/** Slow, ambient rotation — smooth and non-distracting. Radians/second. */
const ROTATE_SPEED = 0.12;

/** A few real places, echoing the journeys the platform is actually built on.
 *  Lat/lng in degrees; converted to a point on the globe's surface below. */
const MARKERS: { lat: number; lng: number; label: string }[] = [
  { lat: 32.24, lng: 77.19, label: "Manali" },
  { lat: 35.36, lng: 138.73, label: "Fuji" },
  { lat: 20.21, lng: -87.46, label: "Tulum" },
  { lat: 38.72, lng: -9.14, label: "Lisbon" },
  { lat: -33.92, lng: 18.42, label: "Cape Town" },
  { lat: -33.87, lng: 151.21, label: "Sydney" },
];

/** Standard lat/lng → xyz-on-sphere conversion. */
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/** easings.net "easeOutBack" — a small overshoot so the pop reads as a soft
 *  bounce rather than a mechanical snap. */
function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function Marker({
  position,
  delay,
  size,
  reduceMotion,
}: {
  position: THREE.Vector3;
  delay: number;
  size: number;
  reduceMotion: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    if (reduceMotion) {
      mesh.scale.setScalar(1);
      return;
    }
    const elapsed = clock.getElapsedTime() - delay;
    if (elapsed <= 0) {
      mesh.scale.setScalar(0);
      return;
    }
    const duration = 0.6;
    const p = Math.min(elapsed / duration, 1);
    mesh.scale.setScalar(Math.max(0, easeOutBack(p)));
  });

  return (
    <mesh ref={ref} position={position} scale={reduceMotion ? 1 : 0}>
      <sphereGeometry args={[size, 12, 12]} />
      <meshStandardMaterial
        color="#f2b84b"
        emissive="#f2b84b"
        emissiveIntensity={0.9}
        toneMapped={false}
      />
    </mesh>
  );
}

function Scene({ reduceMotion }: { reduceMotion: boolean }) {
  const { scene } = useGLTF(MODEL_URL);
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // The model's real-world scale isn't something we control here, so fit the
  // camera and marker placement to whatever radius it actually has.
  const radius = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    return sphere.radius || 1;
  }, [scene]);

  useEffect(() => {
    camera.position.set(0, 0, radius * 2.7);
    camera.lookAt(0, 0, 0);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 40;
      camera.updateProjectionMatrix();
    }
  }, [camera, radius]);

  useFrame((_, delta) => {
    if (reduceMotion || !groupRef.current) return;
    groupRef.current.rotation.y += delta * ROTATE_SPEED;
  });

  const markerRadius = radius * 1.015; // just above the surface
  const markerSize = radius * 0.025;

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
      {MARKERS.map((m, i) => (
        <Marker
          key={m.label}
          position={latLngToVector3(m.lat, m.lng, markerRadius)}
          delay={0.9 + i * 0.5}
          size={markerSize}
          reduceMotion={reduceMotion}
        />
      ))}
    </group>
  );
}

/**
 * The rotating hero globe. Desktop-only mounting and error containment are
 * handled by the caller (hero-globe-loader.tsx) — this component assumes it's
 * safe to touch WebGL/the DOM, which is only true client-side.
 */
export function HeroGlobe() {
  const reduceMotion = Boolean(useReducedMotion());

  return (
    <div className="size-full">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 40, position: [0, 0, 4] }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 3, 5]} intensity={1.4} />
        <directionalLight position={[-4, -2, -3]} intensity={0.3} />
        <Suspense fallback={null}>
          <Scene reduceMotion={reduceMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
