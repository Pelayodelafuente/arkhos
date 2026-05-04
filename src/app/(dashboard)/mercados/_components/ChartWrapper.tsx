'use client';

import { useEffect, useRef, useState } from 'react';

interface ChartWrapperProps {
  children: React.ReactNode;
  minHeight?: number;
  className?: string;
}

export function ChartWrapper({
  children,
  minHeight = 200,
  className = '',
}: ChartWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.offsetWidth > 0) {
      setReady(true);
      return;
    }
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setReady(true);
          observer.disconnect();
        }
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight, width: '100%', minWidth: 0 }}
    >
      {ready ? children : (
        <div
          style={{ height: minHeight }}
          className="animate-pulse bg-white/5 rounded-lg"
        />
      )}
    </div>
  );
}
