"use client";

// ══════════════════════════════════════
// Arkhos OPS — rig de cámara
// Vista frontal estable: establishing shot de entrada, parallax sutil con
// el puntero y dolly cinematográfico hacia la pantalla enfocada. Con
// prefers-reduced-motion todo es corte seco, sin traveling.
// ══════════════════════════════════════

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { SALA_SLOTS } from "@/lib/sala/config";
import { arcPoint } from "@/lib/sala/layout";
import { useSalaStore } from "@/stores/sala-store";

export const CAMERA_INTRO_POS: [number, number, number] = [0, 2.4, 9.8];
const BASE_POS = new THREE.Vector3(0, 1.72, 6.6);
const BASE_TARGET = new THREE.Vector3(0, 1.78, -3.2);
const PARALLAX_X = 0.4;
const PARALLAX_Y = 0.2;
/** Distancia de foco al plano de la pantalla, por tier */
const FOCUS_DISTANCE = { hero: 2.7, mid: 2.0 } as const;

export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const introDone = useRef(false);
  const goalPos = useRef(new THREE.Vector3());
  const goalTarget = useRef(new THREE.Vector3());
  const currentTarget = useRef(BASE_TARGET.clone());

  useFrame((state, delta) => {
    const focusedSlot = useSalaStore.getState().focusedSlot;
    const slot = focusedSlot ? SALA_SLOTS.find((s) => s.id === focusedSlot) : undefined;

    if (slot) {
      // Dolly: cámara frente al centro de la pantalla enfocada
      const [sx, sy, sz] = arcPoint(slot.angleDeg, slot.y, -FOCUS_DISTANCE[slot.tier]);
      const px = reducedMotion ? 0 : state.pointer.x * 0.06;
      const py = reducedMotion ? 0 : state.pointer.y * 0.04;
      goalPos.current.set(sx + px, sy + py, sz);
      const [tx, ty, tz] = arcPoint(slot.angleDeg, slot.y);
      goalTarget.current.set(tx, ty, tz);
    } else {
      const px = reducedMotion ? 0 : state.pointer.x * PARALLAX_X;
      const py = reducedMotion ? 0 : state.pointer.y * PARALLAX_Y;
      goalPos.current.set(BASE_POS.x + px, BASE_POS.y + py, BASE_POS.z);
      goalTarget.current.copy(BASE_TARGET);
    }

    if (reducedMotion) {
      state.camera.position.copy(goalPos.current);
      currentTarget.current.copy(goalTarget.current);
    } else {
      const smoothing = introDone.current ? 0.5 : 1.15;
      easing.damp3(state.camera.position, goalPos.current, smoothing, delta);
      easing.damp3(currentTarget.current, goalTarget.current, smoothing * 0.85, delta);
      if (!introDone.current && state.camera.position.distanceTo(goalPos.current) < 0.06) {
        introDone.current = true;
      }
    }
    state.camera.lookAt(currentTarget.current);
  });

  return null;
}
