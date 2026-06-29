"use client";

import { useCallback, useState } from "react";

interface RechartsMouseState {
  // Recharts v3 tipa el índice como number | string | null.
  activeTooltipIndex?: number | string | null;
}

/**
 * Crosshair para series temporales (Fase 3.2).
 * Devuelve el índice activo (para pintar una <ReferenceLine> vertical) y los props
 * a esparcir en el chart de Recharts. El tooltip existente sigue siendo el readout
 * de valores; el crosshair es la línea vertical adicional.
 */
export function useCrosshair() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onMouseMove = useCallback((state: RechartsMouseState) => {
    const idx = state?.activeTooltipIndex;
    setActiveIndex(typeof idx === "number" ? idx : idx != null ? Number(idx) : null);
  }, []);
  const onMouseLeave = useCallback(() => setActiveIndex(null), []);

  return { activeIndex, chartProps: { onMouseMove, onMouseLeave } };
}
