// ══════════════════════════════════════
// Arkhos OPS — matemática del arco del muro
// ══════════════════════════════════════

import { WALL_ARC, type SalaSlot } from "./config";

export interface SlotTransform {
  position: [number, number, number];
  /** Yaw para que la pantalla mire al centro del arco (el operador) */
  rotationY: number;
}

/** Posición sobre el cilindro del muro para un ángulo/altura dados */
export function arcPoint(angleDeg: number, y: number, radiusOffset = 0): [number, number, number] {
  const a = (angleDeg * Math.PI) / 180;
  const r = WALL_ARC.radius + radiusOffset;
  return [WALL_ARC.cx + r * Math.sin(a), y, WALL_ARC.cz - r * Math.cos(a)];
}

export function slotTransform(slot: SalaSlot, radiusOffset = 0): SlotTransform {
  const a = (slot.angleDeg * Math.PI) / 180;
  return {
    position: arcPoint(slot.angleDeg, slot.y, radiusOffset),
    rotationY: -a,
  };
}
