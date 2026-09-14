"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useFBX } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/** public/models/Globe_Digital.fbx — see public/models/README.md. */
const MODEL_URL = "/models/Globe_Digital.fbx";

/**
 * The source FBX is a 12-mesh "digital globe" assembly, not one sphere: an
 * inner base shell, a middle "Holo Grid" shell, an outer "Continents" shell
 * (three near-identical radii — would z-fight if all rendered solid), five
 * large decorative "Orbit" rings, and four small scattered "Cube" details far
 * from center. None of that is texture-mapped — every material's Blender
 * name ("Holo Grid", "Continents", "Edge wear (Cycles)") is a procedural-
 * shader label that doesn't survive FBX export, so everything loads flat
 * grey (#cccccc). So: keep only the two meshes that make a coherent globe —
 * "Continents" as the solid sphere, "Holo Grid" as a wireframe shell just
 * outside it — hide the rest, and retint what's left to the site's accent.
 */
const SOLID_MESH_NAME = "Outer_Layer-Continents";
const WIREFRAME_MESH_NAME = "Middle_Layer-Holo_Grid";
const TINT_COLOR = "#3f6b96";
const TINT_EMISSIVE = "#2f4d70";
const GRID_COLOR = "#a9cdea";
const GRID_EMISSIVE = "#5b83ad";

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

/** Clone the loaded model (never mutate drei's cached, shared instance),
 *  hide every mesh except the two that make a coherent globe, and retint
 *  those two — one solid, one wireframe. */
function prepareModel(source: THREE.Group): THREE.Group {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    if (child.name === SOLID_MESH_NAME) {
      child.material = tintMaterial(child.material, {
        color: TINT_COLOR,
        emissive: TINT_EMISSIVE,
        emissiveIntensity: 0.4,
        wireframe: false,
      });
    } else if (child.name === WIREFRAME_MESH_NAME) {
      child.material = tintMaterial(child.material, {
        color: GRID_COLOR,
        emissive: GRID_EMISSIVE,
        emissiveIntensity: 0.9,
        wireframe: true,
      });
    } else {
      child.visible = false;
    }
  });
  return clone;
}

function tintMaterial(
  material: THREE.Material | THREE.Material[],
  opts: { color: string; emissive: string; emissiveIntensity: number; wireframe: boolean },
): THREE.Material | THREE.Material[] {
  const tintOne = (mat: THREE.Material): THREE.Material => {
    if (!(mat instanceof THREE.MeshPhongMaterial)) return mat;
    const tinted = mat.clone();
    tinted.color = new THREE.Color(opts.color);
    tinted.emissive = new THREE.Color(opts.emissive);
    tinted.emissiveIntensity = opts.emissiveIntensity;
    tinted.specular = new THREE.Color("#dce6f0");
    tinted.shininess = 45;
    tinted.wireframe = opts.wireframe;
    return tinted;
  };
  return Array.isArray(material) ? material.map(tintOne) : tintOne(material);
}

/** Bounding sphere over only the meshes actually left visible — the full
 *  object's box would still include the hidden orbit rings/cubes, which
 *  Box3.setFromObject does not skip just because .visible is false. */
function visibleBoundingSphere(root: THREE.Object3D): THREE.Sphere {
  const box = new THREE.Box3();
  let any = false;
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.visible) {
      box.union(new THREE.Box3().setFromObject(child));
      any = true;
    }
  });
  if (!any) box.setFromObject(root); // defensive fallback, should not happen
  return box.getBoundingSphere(new THREE.Sphere());
}

function Scene({ reduceMotion }: { reduceMotion: boolean }) {
  const fbx = useFBX(MODEL_URL);
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  const model = useMemo(() => prepareModel(fbx), [fbx]);

  // The model's geometry is not centered at its own origin, and its
  // bounding-sphere radius varies by asset (this one is on the order of
  // 1000+ units) — so both the camera's look-at point and its near/far
  // planes have to be derived from the actual bounds, never assumed.
  // Getting either wrong renders nothing (verified: it did, once).
  const { radius, center } = useMemo(() => {
    const sphere = visibleBoundingSphere(model);
    return { radius: sphere.radius || 1, center: sphere.center.clone() };
  }, [model]);

  // Layout effect, not a plain effect: applied before the first paint, so
  // there's no frame where the default camera (fit for a unit-scale model)
  // briefly renders against this model's actual ~1000-unit scale.
  useLayoutEffect(() => {
    const distance = radius * 3.2; // comfortable margin around the sphere
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 40;
      camera.near = Math.max(radius * 0.01, 0.01);
      camera.far = distance + radius * 4; // default far=2000 clipped this away entirely
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
      {/* Recenter the model onto the group's local origin, so it spins in
          place around its own middle instead of orbiting an offset point. */}
      <primitive object={model} position={[-center.x, -center.y, -center.z]} />
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
        // NoToneMapping: R3F's default ACES filmic curve desaturates mid-tone
        // colors under bright lighting — with it on, the tinted material was
        // reading as near-white/grey instead of the blue actually specified.
        gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
        camera={{ fov: 40, position: [0, 0, 4] }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 3, 5]} intensity={0.85} />
        <directionalLight position={[-4, -2, -3]} intensity={0.2} />
        <Suspense fallback={null}>
          <Scene reduceMotion={reduceMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useFBX.preload(MODEL_URL);
