'use client';

import { useEffect, useState } from 'react';

// ─── Component ───────────────────────

export function CanvasGhostCursor() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        zIndex: 200,
        animation: 'cursorPath 6s ease-in-out 3s infinite',
        opacity: 0,
      }}
    >
      {/* Cursor SVG */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 19 19"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M6.25824 15.1351L2.5709 4.21981C2.21924 3.17882 3.23751 2.19811 4.26455 2.58862L14.9654 6.65745C16.1901 7.12309 16.0348 8.90287 14.748 9.14936L10.9123 9.88412C10.4251 9.97744 10.0335 10.3399 9.90279 10.8184L8.74393 15.0616C8.40583 16.2995 6.66895 16.3509 6.25824 15.1351Z"
          fill="#C4704A"
          stroke="white"
          strokeLinejoin="round"
        />
      </svg>

      {/* Label */}
      <span
        className="absolute select-none whitespace-nowrap"
        style={{
          top: 16,
          left: 16,
          background: '#C4704A',
          color: '#fff',
          fontSize: 9,
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 5,
          border: '0.5px solid rgba(255,255,255,0.35)',
        }}
      >
        Arkhos
      </span>
    </div>
  );
}
