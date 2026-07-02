"use client";

// ══════════════════════════════════════
// Arkhos OPS — bisel 3D de una pantalla
// El marco es WebGL puro: recibe luz y bloom (el contenido DOM no puede).
// El asa inferior es el futuro target de drag (F5) y el borde emisivo
// responde al hover (F4).
// ══════════════════════════════════════

import { SALA_COLORS } from "@/lib/sala/palette";

interface ScreenFrameProps {
  w: number;
  h: number;
  accentHex: string;
  /** Intensidad emisiva del borde (hover/foco/drag la modulan) */
  edgeIntensity?: number;
}

const BORDER = 0.045;
const DEPTH = 0.05;

export function ScreenFrame({ w, h, accentHex, edgeIntensity = 1.1 }: ScreenFrameProps) {
  const outerW = w + BORDER * 2;
  const outerH = h + BORDER * 2;

  return (
    <group>
      {/* Placa trasera */}
      <mesh position={[0, 0, -DEPTH / 2]}>
        <boxGeometry args={[outerW + 0.06, outerH + 0.06, DEPTH]} />
        <meshStandardMaterial color={SALA_COLORS.metal} roughness={0.5} metalness={0.75} />
      </mesh>
      {/* Fondo de la pantalla (visible mientras el DOM monta) */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={SALA_COLORS.screenOff} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Borde emisivo perimetral */}
      <FrameEdge w={outerW} h={outerH} accentHex={accentHex} intensity={edgeIntensity} />
      {/* Asa inferior (target de drag en F5) */}
      <mesh position={[0, -outerH / 2 - 0.07, 0]}>
        <boxGeometry args={[Math.min(0.6, w * 0.3), 0.045, 0.04]} />
        <meshStandardMaterial
          color={SALA_COLORS.metal}
          emissive={accentHex}
          emissiveIntensity={0.5}
          roughness={0.5}
          metalness={0.6}
        />
      </mesh>
    </group>
  );
}

function FrameEdge({
  w,
  h,
  accentHex,
  intensity,
}: {
  w: number;
  h: number;
  accentHex: string;
  intensity: number;
}) {
  const t = 0.016;
  return (
    <group position={[0, 0, 0.012]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, t, t]} />
        <EdgeMaterial accentHex={accentHex} intensity={intensity} />
      </mesh>
      <mesh position={[0, -h / 2, 0]}>
        <boxGeometry args={[w, t, t]} />
        <EdgeMaterial accentHex={accentHex} intensity={intensity} />
      </mesh>
      <mesh position={[-w / 2, 0, 0]}>
        <boxGeometry args={[t, h, t]} />
        <EdgeMaterial accentHex={accentHex} intensity={intensity} />
      </mesh>
      <mesh position={[w / 2, 0, 0]}>
        <boxGeometry args={[t, h, t]} />
        <EdgeMaterial accentHex={accentHex} intensity={intensity} />
      </mesh>
    </group>
  );
}

function EdgeMaterial({ accentHex, intensity }: { accentHex: string; intensity: number }) {
  return (
    <meshStandardMaterial
      color={SALA_COLORS.screenOff}
      emissive={accentHex}
      emissiveIntensity={intensity}
      roughness={0.4}
    />
  );
}
