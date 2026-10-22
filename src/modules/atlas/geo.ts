/**
 * Sphere math for the landing globe. Pure (no three.js) so it is unit-testable
 * and shared by the scene. Convention matches three's SphereGeometry UVs with
 * an equirectangular texture whose left edge is longitude −180°.
 */

export type Vec3 = [number, number, number];

const DEG = Math.PI / 180;

export function latLngToVec3(lat: number, lng: number, radius = 1): Vec3 {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

/**
 * Globe rotation (Euler XYZ: yaw about Y applied first, then pitch about X)
 * that brings a lat/lng to face a camera on the +Z axis.
 */
export function facingRotation(lat: number, lng: number): { yaw: number; pitch: number } {
  const [x, y, z] = latLngToVec3(lat, lng);
  const yaw = Math.atan2(-x, z);
  const zAfterYaw = Math.hypot(x, z);
  const pitch = Math.atan2(y, zAfterYaw);
  return { yaw, pitch };
}

/**
 * Like `facingRotation`, but frames the point off-centre: `yawOffset` < 0
 * moves it left on screen, `pitchOffset` < 0 moves it up. Used so a selected
 * place stays visible beside the preview panel instead of underneath it.
 */
export function framedRotation(
  lat: number,
  lng: number,
  yawOffset: number,
  pitchOffset: number,
): { yaw: number; pitch: number } {
  const [x, y, z] = latLngToVec3(lat, lng);
  const yaw = Math.atan2(-x, z) + yawOffset;
  const pitch = Math.atan2(y, Math.hypot(x, z) * Math.cos(yawOffset)) + pitchOffset;
  return { yaw, pitch };
}

/** Wrap an angle to (−π, π] — so a rotation always takes the short way round. */
export function wrapAngle(a: number): number {
  const twoPi = Math.PI * 2;
  let r = (a + Math.PI) % twoPi;
  if (r < 0) r += twoPi;
  return r - Math.PI;
}

/** Central angle between two lat/lng points, in radians. */
export function centralAngle(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const p1 = latLngToVec3(a.lat, a.lng);
  const p2 = latLngToVec3(b.lat, b.lng);
  const dot = p1[0] * p2[0] + p1[1] * p2[1] + p1[2] * p2[2];
  return Math.acos(Math.min(1, Math.max(-1, dot)));
}

/**
 * Points along the great circle from `a` to `b`, lifted off the surface in a
 * gentle arch (higher for longer routes). Used for journey origin → destination.
 */
export function greatCircleArc(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  segments = 48,
  radius = 1,
): Vec3[] {
  const p1 = latLngToVec3(a.lat, a.lng);
  const p2 = latLngToVec3(b.lat, b.lng);
  const omega = centralAngle(a, b);
  const lift = Math.min(0.32, Math.max(0.012, omega * 0.45));
  const sinOmega = Math.sin(omega);
  const out: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const k1 = sinOmega < 1e-6 ? 1 - t : Math.sin((1 - t) * omega) / sinOmega;
    const k2 = sinOmega < 1e-6 ? t : Math.sin(t * omega) / sinOmega;
    const r = radius * (1 + lift * Math.sin(Math.PI * t));
    out.push([
      (k1 * p1[0] + k2 * p2[0]) * r,
      (k1 * p1[1] + k2 * p2[1]) * r,
      (k1 * p1[2] + k2 * p2[2]) * r,
    ]);
  }
  return out;
}
