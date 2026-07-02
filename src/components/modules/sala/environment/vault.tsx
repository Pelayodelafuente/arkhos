"use client";

// ══════════════════════════════════════
// Arkhos OPS — la cámara acorazada
// Puerta de vault en el flanco izquierdo con el capital invertido real
// grabado en una placa. Puro prop con alma: anillos, radios y remaches.
// ══════════════════════════════════════

import { Html } from "@react-three/drei";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { SALA_COLORS } from "@/lib/sala/palette";
import { fmtEur } from "@/lib/sala/format";
import { arcPoint } from "@/lib/sala/layout";

const ANGLE = -40;
const SPOKES = [0, Math.PI / 3, (2 * Math.PI) / 3];

export function Vault() {
  const invested = usePatrimonioStore((s) => s.overview?.total_invested ?? null);
  const [x, , z] = arcPoint(ANGLE, 0, -0.35);
  const rotationY = (-ANGLE * Math.PI) / 180;

  return (
    <group position={[x, 1.42, z]} rotation-y={rotationY}>
      {/* Marco exterior */}
      <mesh>
        <torusGeometry args={[0.92, 0.075, 12, 64]} />
        <meshStandardMaterial color={SALA_COLORS.metal} roughness={0.35} metalness={0.9} />
      </mesh>
      {/* Puerta */}
      <mesh position={[0, 0, -0.02]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.86, 0.86, 0.1, 64]} />
        <meshStandardMaterial color={SALA_COLORS.metal} roughness={0.38} metalness={0.85} />
      </mesh>
      {/* Luz propia de la cámara acorazada */}
      <pointLight position={[0.4, 0.3, 1.1]} intensity={4} color={SALA_COLORS.copper} distance={3.5} decay={2} />
      {/* Anillo de luz interior */}
      <mesh position={[0, 0, 0.045]}>
        <torusGeometry args={[0.62, 0.008, 6, 64]} />
        <meshStandardMaterial
          color={SALA_COLORS.screenOff}
          emissive={SALA_COLORS.copper}
          emissiveIntensity={1.8}
        />
      </mesh>
      {/* Radios del mecanismo */}
      {SPOKES.map((rot) => (
        <mesh key={rot} position={[0, 0, 0.06]} rotation-z={rot}>
          <boxGeometry args={[0.98, 0.045, 0.04]} />
          <meshStandardMaterial color={SALA_COLORS.metal} roughness={0.35} metalness={0.9} />
        </mesh>
      ))}
      {/* Hub central */}
      <mesh position={[0, 0, 0.07]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.14, 0.16, 0.08, 24]} />
        <meshStandardMaterial color={SALA_COLORS.metal} roughness={0.3} metalness={0.95} />
      </mesh>
      {/* Placa con el capital invertido real */}
      <Html
        transform
        distanceFactor={400 / 300}
        position={[0, -1.22, 0.05]}
        zIndexRange={[4, 0]}
        style={{ width: 240, height: 44 }}
      >
        <div className="flex h-[44px] w-[240px] select-none flex-col items-center justify-center rounded border border-[var(--sala-border)] bg-[rgba(7,7,13,0.92)]">
          <span className="font-mono text-[8px] tracking-[0.35em] text-[var(--sala-text-dim)]">
            CAPITAL INVERTIDO
          </span>
          <span className="financial-number text-[15px] text-[var(--sala-copper)]">
            {fmtEur(invested)}
          </span>
        </div>
      </Html>
    </group>
  );
}
