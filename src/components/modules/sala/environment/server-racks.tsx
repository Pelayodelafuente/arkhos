"use client";

// ══════════════════════════════════════
// Arkhos OPS — racks de servidores
// Cabinas a ambos lados del muro con matrices de LEDs instanciados que
// parpadean; el ritmo responde a la actividad real (activity_log).
// ══════════════════════════════════════

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useDashboardStore } from "@/stores/dashboard-store";
import { SALA_COLORS } from "@/lib/sala/palette";
import { arcPoint } from "@/lib/sala/layout";

const UNITS = 6;
const LEDS_PER_UNIT = 8;
const LED_COUNT = UNITS * LEDS_PER_UNIT;

// Colores premultiplicados > 1 para superar el umbral del bloom
// (instanceColor modula el color base del material, no el emissive)
const LED_ON = new THREE.Color(SALA_COLORS.gain).multiplyScalar(2.6);
const LED_WARN = new THREE.Color(SALA_COLORS.copper).multiplyScalar(2.4);
const LED_OFF = new THREE.Color("#141420");

export function ServerRacks({ reducedMotion }: { reducedMotion: boolean }) {
  const activityCount = useDashboardStore((s) => s.data?.initialActivity.length ?? 0);
  // Más actividad reciente → parpadeo más nervioso
  const blinkInterval = Math.max(0.1, 0.45 - Math.min(activityCount, 8) * 0.04);

  return (
    <>
      {[-57, 40, 57].map((angle) => (
        <Rack
          key={angle}
          angle={angle}
          blinkInterval={blinkInterval}
          reducedMotion={reducedMotion}
        />
      ))}
    </>
  );
}

function Rack({
  angle,
  blinkInterval,
  reducedMotion,
}: {
  angle: number;
  blinkInterval: number;
  reducedMotion: boolean;
}) {
  const leds = useRef<THREE.InstancedMesh>(null);
  const nextBlink = useRef(0);

  // Posiciones de la matriz de LEDs sobre el frente de las unidades
  const ledTransforms = useMemo(() => {
    const dummy = new THREE.Object3D();
    const matrices: THREE.Matrix4[] = [];
    for (let u = 0; u < UNITS; u++) {
      const y = 0.38 + u * 0.3;
      for (let l = 0; l < LEDS_PER_UNIT; l++) {
        dummy.position.set(-0.38 + l * 0.075, y + 0.07, 0.262);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
      }
    }
    return matrices;
  }, []);

  useEffect(() => {
    const mesh = leds.current;
    if (!mesh) return;
    ledTransforms.forEach((m, i) => mesh.setMatrixAt(i, m));
    for (let i = 0; i < LED_COUNT; i++) {
      const roll = Math.random();
      mesh.setColorAt(i, roll < 0.45 ? LED_ON : roll < 0.55 ? LED_WARN : LED_OFF);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [ledTransforms]);

  useFrame((state) => {
    if (reducedMotion) return;
    const mesh = leds.current;
    if (!mesh || state.clock.elapsedTime < nextBlink.current) return;
    nextBlink.current = state.clock.elapsedTime + blinkInterval;
    for (let n = 0; n < 3; n++) {
      const i = Math.floor(Math.random() * LED_COUNT);
      const roll = Math.random();
      mesh.setColorAt(i, roll < 0.5 ? LED_ON : roll < 0.62 ? LED_WARN : LED_OFF);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const [x, , z] = arcPoint(angle, 0, -0.6);
  const rotationY = (-angle * Math.PI) / 180;

  return (
    <group position={[x, 0, z]} rotation-y={rotationY}>
      {/* Cabina */}
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[1.05, 2.3, 0.52]} />
        <meshStandardMaterial color={SALA_COLORS.metalDark} roughness={0.6} metalness={0.7} />
      </mesh>
      {/* Unidades frontales */}
      {Array.from({ length: UNITS }, (_, u) => (
        <mesh key={u} position={[0, 0.38 + u * 0.3, 0.255]}>
          <boxGeometry args={[0.92, 0.24, 0.02]} />
          <meshStandardMaterial color={SALA_COLORS.metal} roughness={0.45} metalness={0.8} />
        </mesh>
      ))}
      {/* Matriz de LEDs */}
      <instancedMesh ref={leds} args={[undefined, undefined, LED_COUNT]}>
        <boxGeometry args={[0.022, 0.022, 0.012]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {/* Zócalo */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[1.12, 0.12, 0.6]} />
        <meshStandardMaterial color={SALA_COLORS.metal} roughness={0.5} metalness={0.8} />
      </mesh>
    </group>
  );
}
