"use client";

// ══════════════════════════════════════
// Arkhos OPS — rig de cámara
// Vista frontal estable: establishing shot de entrada, parallax sutil con
// el puntero y (en F4) dolly hacia la pantalla enfocada. Con
// prefers-reduced-motion todo es corte seco, sin traveling.
// ══════════════════════════════════════

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";

export const CAMERA_INTRO_POS: [number, number, number] = [0, 2.4, 9.8];
const BASE_POS = new THREE.Vector3(0, 1.72, 6.6);
const TARGET = new THREE.Vector3(0, 1.78, -3.2);
const PARALLAX_X = 0.4;
const PARALLAX_Y = 0.2;

export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const introDone = useRef(false);
  const goal = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const px = reducedMotion ? 0 : state.pointer.x * PARALLAX_X;
    const py = reducedMotion ? 0 : state.pointer.y * PARALLAX_Y;
    goal.current.set(BASE_POS.x + px, BASE_POS.y + py, BASE_POS.z);

    if (reducedMotion) {
      state.camera.position.copy(goal.current);
    } else {
      const smoothing = introDone.current ? 0.5 : 1.15;
      easing.damp3(state.camera.position, goal.current, smoothing, delta);
      if (!introDone.current && state.camera.position.distanceTo(goal.current) < 0.06) {
        introDone.current = true;
      }
    }
    state.camera.lookAt(TARGET);
  });

  return null;
}
