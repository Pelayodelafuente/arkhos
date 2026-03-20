'use client';

import { useEffect, useRef, useState } from 'react';

export function CanvasGrid() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    // Trigger animation on mount
    const timer = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const shouldAnimate = !prefersReducedMotion;
  const clipPath = shouldAnimate
    ? animated
      ? 'circle(180% at 50% 50%)'
      : 'circle(0% at 50% 50%)'
    : 'circle(180% at 50% 50%)';

  return (
    <div
      ref={gridRef}
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: [
          'linear-gradient(to right, rgba(196,112,74,0.09) 1px, transparent 1px)',
          'linear-gradient(to bottom, rgba(196,112,74,0.09) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '44px 44px',
        backgroundPosition: '22px 22px',
        clipPath,
        transition: shouldAnimate
          ? 'clip-path 2.2s cubic-bezier(0.22, 1, 0.36, 1)'
          : 'none',
      }}
    />
  );
}
