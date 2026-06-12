"use client";
import { useState, useEffect } from "react";

export function useAnimatedCounter(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);

  // Reset inmediato cuando el target pasa a 0 (ajuste de estado en render)
  const [prevTarget, setPrevTarget] = useState(target);
  if (target !== prevTarget) {
    setPrevTarget(target);
    if (target === 0) setValue(0);
  }

  useEffect(() => {
    if (target === 0) {
      return;
    }
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
