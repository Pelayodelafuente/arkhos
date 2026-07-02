"use client";

// ══════════════════════════════════════
// Arkhos OPS — la habitación
// Suelo reflectante, casco cilíndrico del muro, molduras de cobre que
// recorren el arco, columnas estructurales, techo y dais del operador.
// Todo procedural: cero assets externos.
// ══════════════════════════════════════

import * as THREE from "three";
import { MeshReflectorMaterial } from "@react-three/drei";
import { SALA_COLORS } from "@/lib/sala/palette";
import { WALL_ARC } from "@/lib/sala/config";
import { arcPoint } from "@/lib/sala/layout";

/** Arco visible del muro (grados) */
const WALL_SPAN_DEG = 100;
const WALL_SPAN = (WALL_SPAN_DEG * Math.PI) / 180;
/** thetaStart para centrar el arco mirando al operador (cylinderGeometry) */
const WALL_THETA_START = Math.PI - WALL_SPAN / 2;
/** rotation-y para centrar un torus-arc (ver derivación en camera/layout) */
const TRIM_YAW = ((90 + WALL_SPAN_DEG / 2) * Math.PI) / 180;

export function Room() {
  return (
    <>
      <Floor />
      <WallShell />
      <WallTrim y={4.15} intensity={3} />
      <WallTrim y={0.16} intensity={2.2} />
      <Columns />
      <Ceiling />
      <OperatorDais />
    </>
  );
}

function Floor() {
  return (
    <mesh rotation-x={-Math.PI / 2}>
      <planeGeometry args={[60, 60]} />
      <MeshReflectorMaterial
        blur={[300, 80]}
        resolution={1024}
        mixBlur={1}
        mixStrength={55}
        roughness={0.85}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color={SALA_COLORS.floor}
        metalness={0.5}
        mirror={0.55}
      />
    </mesh>
  );
}

function WallShell() {
  return (
    <mesh position={[WALL_ARC.cx, 3.2, WALL_ARC.cz]}>
      <cylinderGeometry
        args={[WALL_ARC.radius + 0.25, WALL_ARC.radius + 0.25, 7.6, 96, 1, true, WALL_THETA_START, WALL_SPAN]}
      />
      <meshStandardMaterial
        color={SALA_COLORS.wall}
        roughness={0.92}
        metalness={0.25}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

/** Moldura de cobre que recorre el arco del muro a una altura dada */
function WallTrim({ y, intensity }: { y: number; intensity: number }) {
  return (
    <group position={[WALL_ARC.cx, y, WALL_ARC.cz]} rotation-y={TRIM_YAW}>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[WALL_ARC.radius + 0.12, 0.018, 6, 128, WALL_SPAN]} />
        <meshStandardMaterial
          color={SALA_COLORS.screenOff}
          emissive={SALA_COLORS.copper}
          emissiveIntensity={intensity}
        />
      </mesh>
    </group>
  );
}

const COLUMN_ANGLES = [-52, -38, 38, 52];

function Columns() {
  return (
    <>
      {COLUMN_ANGLES.map((angle) => (
        <group key={angle} position={arcPoint(angle, 3.2, 0.1)} rotation-y={(-angle * Math.PI) / 180}>
          <mesh>
            <boxGeometry args={[0.3, 7.6, 0.34]} />
            <meshStandardMaterial color={SALA_COLORS.metal} roughness={0.6} metalness={0.7} />
          </mesh>
          {/* Vena luminosa de la columna */}
          <mesh position={[0, 0, 0.18]}>
            <boxGeometry args={[0.025, 7.2, 0.01]} />
            <meshStandardMaterial
              color={SALA_COLORS.screenOff}
              emissive={SALA_COLORS.copperDark}
              emissiveIntensity={1.6}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Ceiling() {
  return (
    <mesh rotation-x={Math.PI / 2} position={[0, 6.9, 0]}>
      <circleGeometry args={[24, 48]} />
      <meshStandardMaterial color={SALA_COLORS.metalDark} roughness={0.95} metalness={0.2} />
    </mesh>
  );
}

/** Plataforma del puesto del operador con su anillo de luz */
function OperatorDais() {
  return (
    <group position={[0, 0, 3.4]}>
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[1.7, 1.78, 0.07, 48]} />
        <meshStandardMaterial color={SALA_COLORS.metal} roughness={0.55} metalness={0.75} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.075, 0]}>
        <torusGeometry args={[1.58, 0.012, 6, 96]} />
        <meshStandardMaterial
          color={SALA_COLORS.screenOff}
          emissive={SALA_COLORS.copper}
          emissiveIntensity={2.4}
        />
      </mesh>
    </group>
  );
}
