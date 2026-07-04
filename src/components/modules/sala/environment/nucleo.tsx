"use client";

// ══════════════════════════════════════
// Arkhos OPS — el Núcleo
// Representación física del patrimonio: un core icosaédrico cuyo color y
// pulso responden al P&L real (verde ganancia / rojo pérdida), con anillos
// orbitales, carcasa wireframe y halo de partículas.
// ══════════════════════════════════════

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { SALA_COLORS } from "@/lib/sala/palette";
import { mulberry32 } from "@/lib/sala/random";

const POSITION: [number, number, number] = [0, 0, -2.05];
const PARTICLE_COUNT = 360;

export function Nucleo({ reducedMotion }: { reducedMotion: boolean }) {
  const plPct = usePatrimonioStore((s) => s.overview?.pl_percentage ?? 0);
  const positive = plPct >= 0;
  const coreColor = positive ? SALA_COLORS.gain : SALA_COLORS.loss;
  // El pulso se acelera con la magnitud del P&L (cap al 10%)
  const pulseSpeed = 1 + Math.min(Math.abs(plPct), 10) / 5;

  const coreMat = useRef<THREE.MeshStandardMaterial>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const rnd = mulberry32(0x9c1e0);
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 0.5 + rnd() * 0.22;
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(2 * rnd() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.75;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    if (coreMat.current) {
      coreMat.current.emissiveIntensity = 1.7 + Math.sin(t * pulseSpeed) * 0.55;
    }
    if (ring1.current) ring1.current.rotation.z += delta * 0.28;
    if (ring2.current) ring2.current.rotation.z -= delta * 0.2;
    if (shell.current) {
      shell.current.rotation.y += delta * 0.1;
      shell.current.rotation.x = Math.sin(t * 0.18) * 0.12;
    }
    if (halo.current) halo.current.rotation.y -= delta * 0.05;
  });

  return (
    <group position={POSITION}>
      {/* Pedestal */}
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.42, 0.5, 0.14, 32]} />
        <meshStandardMaterial color={SALA_COLORS.metal} roughness={0.5} metalness={0.8} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.145, 0]}>
        <torusGeometry args={[0.36, 0.01, 6, 48]} />
        <meshStandardMaterial
          color={SALA_COLORS.screenOff}
          emissive={SALA_COLORS.copper}
          emissiveIntensity={2}
        />
      </mesh>

      <group position={[0, 0.82, 0]}>
        {/* Core */}
        <mesh>
          <icosahedronGeometry args={[0.24, 1]} />
          <meshStandardMaterial
            ref={coreMat}
            color={SALA_COLORS.screenOff}
            emissive={coreColor}
            emissiveIntensity={1.9}
            roughness={0.25}
            flatShading
          />
        </mesh>
        {/* Carcasa wireframe */}
        <mesh ref={shell}>
          <icosahedronGeometry args={[0.42, 1]} />
          <meshBasicMaterial color={SALA_COLORS.copperDark} wireframe transparent opacity={0.35} />
        </mesh>
        {/* Anillos orbitales */}
        <mesh ref={ring1} rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[0.58, 0.006, 6, 96]} />
          <meshStandardMaterial
            color={SALA_COLORS.screenOff}
            emissive={SALA_COLORS.copper}
            emissiveIntensity={1.5}
          />
        </mesh>
        <mesh ref={ring2} rotation={[-Math.PI / 3.2, 0.4, 0]}>
          <torusGeometry args={[0.66, 0.004, 6, 96]} />
          <meshStandardMaterial
            color={SALA_COLORS.screenOff}
            emissive={coreColor}
            emissiveIntensity={1.1}
          />
        </mesh>
        {/* Halo de partículas */}
        <points ref={halo}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[particles, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color={SALA_COLORS.copper}
            size={0.013}
            transparent
            opacity={0.65}
            sizeAttenuation
            depthWrite={false}
          />
        </points>
        {/* Luz que el núcleo proyecta sobre el entorno */}
        <pointLight color={coreColor} intensity={2.4} distance={4.5} decay={2} />
      </group>
    </group>
  );
}
