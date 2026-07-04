"use client";

// ══════════════════════════════════════
// Arkhos OPS — atmósfera
// Polvo en suspensión con deriva lenta: vida ambiental de coste mínimo
// (un solo draw call de Points).
// ══════════════════════════════════════

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SALA_COLORS } from "@/lib/sala/palette";
import { mulberry32 } from "@/lib/sala/random";

const DUST_COUNT = 220;

export function Atmosphere({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const rnd = mulberry32(0xa7c0);
    const arr = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      arr[i * 3] = (rnd() - 0.5) * 14;
      arr[i * 3 + 1] = rnd() * 5.5;
      arr[i * 3 + 2] = -4 + rnd() * 10;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (reducedMotion || !points.current) return;
    const t = state.clock.elapsedTime;
    points.current.rotation.y = Math.sin(t * 0.02) * 0.08;
    points.current.position.y = Math.sin(t * 0.11) * 0.06;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={SALA_COLORS.copper}
        size={0.008}
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
