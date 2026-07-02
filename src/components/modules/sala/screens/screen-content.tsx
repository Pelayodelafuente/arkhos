"use client";

// ══════════════════════════════════════
// Arkhos OPS — contenido DOM de una pantalla
// <Html transform> proyecta un div real dentro de la escena: los widgets
// React/Recharts son completamente interactivos (tooltips, hover, click).
// Dimensiones FIJAS en px por slot: nada de ResponsiveContainer dentro de
// un transform CSS3D (los ResizeObserver miden tamaños transformados).
// ══════════════════════════════════════

import { Html } from "@react-three/drei";
import type { SalaSlot, SalaWidgetKey } from "@/lib/sala/config";
import { SALA_WIDGETS } from "../widgets/registry";

/** Píxeles CSS por unidad de escena (drei Html transform: ratio = distanceFactor/400) */
export const PX_PER_UNIT = 300;
const DISTANCE_FACTOR = 400 / PX_PER_UNIT;
/** Padding interior (px) del área de contenido del shell */
const CONTENT_PADDING = 24;
/** Altura del header del shell (px) */
const HEADER_PX = 30;

export function ScreenContent({ slot, widgetKey }: { slot: SalaSlot; widgetKey: SalaWidgetKey }) {
  const meta = SALA_WIDGETS[widgetKey];
  const wPx = Math.round(slot.w * PX_PER_UNIT);
  const hPx = Math.round(slot.h * PX_PER_UNIT);
  const Widget = meta.Component;

  return (
    <Html
      transform
      distanceFactor={DISTANCE_FACTOR}
      position={[0, 0, 0.02]}
      zIndexRange={[5, 0]}
      style={{ width: wPx, height: hPx }}
    >
      <div style={{ width: wPx, height: hPx }} className="select-none">
        <Widget width={wPx - CONTENT_PADDING} height={hPx - HEADER_PX - CONTENT_PADDING} />
      </div>
    </Html>
  );
}
