"use client";

// ══════════════════════════════════════
// Arkhos OPS — consola del operador
// Escritorio de tres cuerpos inclinados en primer plano. Las superficies
// llevan un panel tenue (instrumentos reales en fases posteriores) y una
// arista de cobre que recoge el bloom.
// ══════════════════════════════════════

import { SALA_COLORS } from "@/lib/sala/palette";

interface DeskSectionProps {
  position: [number, number, number];
  rotationY: number;
}

export function OperatorConsole() {
  return (
    <group>
      <DeskSection position={[0, 0, 4.1]} rotationY={0} />
      <DeskSection position={[-1.62, 0, 4.42]} rotationY={0.5} />
      <DeskSection position={[1.62, 0, 4.42]} rotationY={-0.5} />
    </group>
  );
}

function DeskSection({ position, rotationY }: DeskSectionProps) {
  return (
    <group position={position} rotation-y={rotationY}>
      {/* Pedestal */}
      <mesh position={[0, 0.38, 0.1]}>
        <boxGeometry args={[1.15, 0.76, 0.34]} />
        <meshStandardMaterial color={SALA_COLORS.metalDark} roughness={0.7} metalness={0.6} />
      </mesh>
      {/* Tablero inclinado hacia el operador */}
      <group position={[0, 0.86, 0]} rotation-x={0.42}>
        <mesh>
          <boxGeometry args={[1.55, 0.055, 0.78]} />
          <meshStandardMaterial color={SALA_COLORS.metalDark} roughness={0.7} metalness={0.5} />
        </mesh>
        {/* Panel de instrumentos (contenido real en F6/F7) */}
        <mesh position={[0, 0.032, -0.04]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[1.38, 0.56]} />
          <meshStandardMaterial
            color={SALA_COLORS.screenOff}
            emissive={SALA_COLORS.copperDark}
            emissiveIntensity={0.05}
            roughness={0.85}
            metalness={0.05}
          />
        </mesh>
        {/* Arista de cobre frontal */}
        <mesh position={[0, 0.02, 0.39]}>
          <boxGeometry args={[1.55, 0.016, 0.016]} />
          <meshStandardMaterial
            color={SALA_COLORS.screenOff}
            emissive={SALA_COLORS.copper}
            emissiveIntensity={2.6}
          />
        </mesh>
      </group>
    </group>
  );
}
