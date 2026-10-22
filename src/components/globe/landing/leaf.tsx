/** A single leaf, drawn around its own centre (0,0), ~20 units long. */
export const LEAF_PATH =
  "M0,-10 C6,-7 7.5,-1 5.5,4 C3.8,8 1.4,9.6 0,10 C-1.4,9.6 -3.8,8 -5.5,4 C-7.5,-1 -6,-7 0,-10 Z";
export const LEAF_VEIN = "M0,-8.5 L0,9.2";

export function LeafIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="-11 -11 22 22" className={className} aria-hidden>
      <path d={LEAF_PATH} fill="currentColor" />
      <path d={LEAF_VEIN} stroke="rgba(0,0,0,0.18)" strokeWidth="0.9" fill="none" />
    </svg>
  );
}
