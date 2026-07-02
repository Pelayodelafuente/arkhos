"use client";

// ══════════════════════════════════════
// Arkhos OPS — controlador de drag & drop del muro
// El arrastre lo inicia el grip DOM de la toolbar (setDraggingSlot); aquí
// se raycastea el puntero contra un cilindro invisible en el radio del
// muro, se calcula el slot más cercano (candidato a swap) y al soltar se
// intercambian las asignaciones.
// ══════════════════════════════════════

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { SALA_SLOTS, WALL_ARC } from "@/lib/sala/config";
import { useSalaStore } from "@/stores/sala-store";

const WALL_SPAN = (100 * Math.PI) / 180;
const WALL_THETA_START = Math.PI - WALL_SPAN / 2;
/** Score máximo (≈ grados/10 + unidades y) para aceptar un slot como destino */
const MAX_SNAP_SCORE = 1.6;

export function DragController() {
  const { camera, gl } = useThree();
  const draggingSlot = useSalaStore((s) => s.draggingSlot);
  const wallRef = useRef<THREE.Mesh>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const ndc = useRef(new THREE.Vector2());

  useEffect(() => {
    if (!draggingSlot) return;
    const dom = gl.domElement;

    const onMove = (e: PointerEvent) => {
      const wall = wallRef.current;
      if (!wall) return;
      const rect = dom.getBoundingClientRect();
      ndc.current.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.current.setFromCamera(ndc.current, camera);
      const hits = raycaster.current.intersectObject(wall);
      const store = useSalaStore.getState();
      if (hits.length === 0) {
        store.setDropTargetSlot(null);
        return;
      }
      const p = hits[0].point;
      const angleDeg =
        (Math.atan2(p.x - WALL_ARC.cx, -(p.z - WALL_ARC.cz)) * 180) / Math.PI;
      let bestId: (typeof SALA_SLOTS)[number]["id"] | null = null;
      let bestScore = Infinity;
      for (const slot of SALA_SLOTS) {
        const score = Math.abs(slot.angleDeg - angleDeg) / 10 + Math.abs(slot.y - p.y);
        if (score < bestScore) {
          bestScore = score;
          bestId = slot.id;
        }
      }
      store.setDropTargetSlot(bestScore <= MAX_SNAP_SCORE ? bestId : null);
    };

    const onUp = () => {
      const store = useSalaStore.getState();
      const source = store.draggingSlot;
      const target = store.dropTargetSlot;
      if (source && target && source !== target) {
        store.swapSlots(source, target);
      }
      store.setDraggingSlot(null);
      store.setDropTargetSlot(null);
    };

    document.body.style.cursor = "grabbing";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
    };
  }, [draggingSlot, camera, gl]);

  return (
    <mesh ref={wallRef} position={[WALL_ARC.cx, 2, WALL_ARC.cz]}>
      <cylinderGeometry
        args={[WALL_ARC.radius, WALL_ARC.radius, 6.5, 64, 1, true, WALL_THETA_START, WALL_SPAN]}
      />
      {/* Superficie de raycast: nunca se pinta, pero debe ser "visible" */}
      <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}
