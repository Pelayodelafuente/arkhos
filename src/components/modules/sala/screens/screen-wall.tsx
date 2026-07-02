"use client";

// ══════════════════════════════════════
// Arkhos OPS — el muro de pantallas
// Un ScreenSlot por posición del arco; la asignación slot→widget vive en
// el sala-store (persistida en localStorage).
// ══════════════════════════════════════

import { SALA_SLOTS, type SalaSlot } from "@/lib/sala/config";
import { slotTransform } from "@/lib/sala/layout";
import { useSalaStore } from "@/stores/sala-store";
import { SALA_WIDGETS } from "../widgets/registry";
import { ScreenFrame } from "./screen-frame";
import { ScreenContent } from "./screen-content";

export function ScreenWall() {
  return (
    <>
      {SALA_SLOTS.map((slot) => (
        <ScreenSlot key={slot.id} slot={slot} />
      ))}
    </>
  );
}

function ScreenSlot({ slot }: { slot: SalaSlot }) {
  const widgetKey = useSalaStore((s) => s.assignments[slot.id]);
  const highlighted = useSalaStore(
    (s) => s.hoveredSlot === slot.id || s.focusedSlot === slot.id
  );
  const { position, rotationY } = slotTransform(slot);
  const meta = SALA_WIDGETS[widgetKey];

  return (
    <group position={position} rotation-y={rotationY}>
      <ScreenFrame w={slot.w} h={slot.h} accentHex={meta.accentHex} highlighted={highlighted} />
      <ScreenContent slot={slot} widgetKey={widgetKey} />
    </group>
  );
}
