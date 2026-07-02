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
import { useSalaStore } from "@/stores/sala-store";
import { SALA_WIDGETS } from "../widgets/registry";
import { SlotToolbar } from "./slot-chrome";

/** Píxeles CSS por unidad de escena (drei Html transform: ratio = distanceFactor/400) */
export const PX_PER_UNIT = 300;
const DISTANCE_FACTOR = 400 / PX_PER_UNIT;
/** Padding interior (px) del área de contenido del shell */
const CONTENT_PADDING = 24;
/** Altura del header del shell (px) */
const HEADER_PX = 30;
/** Altura de la barra de acciones bajo la pantalla (px) */
const TOOLBAR_PX = 30;

export function ScreenContent({
  slot,
  widgetKey,
  dimmed = false,
}: {
  slot: SalaSlot;
  widgetKey: SalaWidgetKey;
  /** Atenuado mientras se arrastra esta pantalla */
  dimmed?: boolean;
}) {
  const meta = SALA_WIDGETS[widgetKey];
  const hovered = useSalaStore((s) => s.hoveredSlot === slot.id);
  const setHoveredSlot = useSalaStore((s) => s.setHoveredSlot);
  const wPx = Math.round(slot.w * PX_PER_UNIT);
  const hPx = Math.round(slot.h * PX_PER_UNIT);
  const Widget = meta.Component;

  return (
    <Html
      transform
      distanceFactor={DISTANCE_FACTOR}
      position={[0, -TOOLBAR_PX / 2 / PX_PER_UNIT, 0.02]}
      zIndexRange={[5, 0]}
      style={{ width: wPx, height: hPx + TOOLBAR_PX }}
    >
      <div
        className="relative select-none transition-opacity duration-200"
        style={{ width: wPx, height: hPx + TOOLBAR_PX, opacity: dimmed ? 0.35 : 1 }}
        onPointerEnter={() => setHoveredSlot(slot.id)}
        onPointerLeave={() => setHoveredSlot(null)}
      >
        <div style={{ width: wPx, height: hPx }}>
          <Widget width={wPx - CONTENT_PADDING} height={hPx - HEADER_PX - CONTENT_PADDING} />
        </div>
        <SlotToolbar slotId={slot.id} visible={hovered} screenHeight={hPx} />
      </div>
    </Html>
  );
}
