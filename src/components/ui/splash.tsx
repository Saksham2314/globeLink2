/**
 * Opening loading screen: a spinning globe with a leaf travelling its orbit,
 * the wordmark, and a progress line. Server-rendered and timed entirely in CSS
 * (`.gl-splash` in globals.css), so it always clears itself within ~1.5s —
 * with or without JavaScript — and never captures clicks. The no-flash script
 * in the root layout hides it for the rest of the browser session, and it is
 * skipped under reduced motion. Decorative: hidden from assistive tech.
 */
export function Splash() {
  return (
    <div aria-hidden className="gl-splash">
      <div className="gl-splash-inner">
        <svg viewBox="-100 -100 200 200" className="gl-splash-globe">
          <defs>
            <radialGradient id="gl-splash-sphere" cx="35%" cy="30%" r="75%">
              <stop offset="0" stopColor="var(--gl-accent)" stopOpacity="0.55" />
              <stop offset="1" stopColor="var(--gl-accent)" stopOpacity="0.08" />
            </radialGradient>
            <clipPath id="gl-splash-clip">
              <circle r="46" />
            </clipPath>
          </defs>

          {/* orbit */}
          <circle
            r="78"
            fill="none"
            stroke="var(--gl-accent)"
            strokeOpacity="0.28"
            strokeWidth="1"
            strokeDasharray="2 7"
          />

          {/* globe */}
          <circle r="46" fill="url(#gl-splash-sphere)" />
          <g
            clipPath="url(#gl-splash-clip)"
            fill="none"
            stroke="var(--gl-accent)"
            strokeOpacity="0.65"
            strokeWidth="1.2"
          >
            <ellipse rx="46" ry="16" />
            <ellipse rx="46" ry="34" strokeOpacity="0.35" />
            {/* meridians sweep across — the globe turning */}
            {[0, -0.7, -1.4].map((begin) => (
              <ellipse key={begin} rx="46" ry="46">
                <animate
                  attributeName="rx"
                  values="46;0;46"
                  keyTimes="0;0.5;1"
                  dur="2.1s"
                  begin={`${begin}s`}
                  repeatCount="indefinite"
                />
              </ellipse>
            ))}
          </g>
          <circle
            r="46"
            fill="none"
            stroke="var(--gl-accent)"
            strokeOpacity="0.8"
            strokeWidth="1.4"
          />

          {/* a leaf travelling the orbit */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 0"
              to="360 0 0"
              dur="2.2s"
              repeatCount="indefinite"
            />
            <path
              transform="translate(0 -78) rotate(90) scale(0.9)"
              d="M0,-10 C6,-7 7.5,-1 5.5,4 C3.8,8 1.4,9.6 0,10 C-1.4,9.6 -3.8,8 -5.5,4 C-7.5,-1 -6,-7 0,-10 Z"
              fill="#e9a650"
            />
          </g>
        </svg>

        <p className="gl-splash-word font-display text-ink text-2xl tracking-tight">
          Globe<span className="text-accent">Link</span>
        </p>
        <p className="gl-splash-tag text-muted text-[10px] font-semibold tracking-[0.3em] uppercase">
          Travel, lived
        </p>
        <span className="gl-splash-bar" />
      </div>
    </div>
  );
}
