"use client";

// ══════════════════════════════════════
// Arkhos OPS — experiencia 3D (Canvas R3F)
// F1: escenario base — suelo reflectante, niebla, iluminación cobre y
// geometría de referencia del muro. La sala real se construye en F2+.
// ══════════════════════════════════════

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import { SALA_COLORS } from "@/lib/sala/palette";
import { WALL_ARC } from "@/lib/sala/config";

const CAMERA_TARGET = new THREE.Vector3(0, 1.7, -3.2);

export function SalaExperience() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 1.7, 6.6], fov: 42 }}
      onCreated={({ camera }) => camera.lookAt(CAMERA_TARGET)}
    >
      <color attach="background" args={[SALA_COLORS.bg]} />
      <fog attach="fog" args={[SALA_COLORS.fog, 10, 28]} />
      <Lighting />
      <Floor />
      <WallShell />
      <PlaceholderProps />
    </Canvas>
  );
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.14} />
      {/* Key frontal cálida desde arriba del operador */}
      <spotLight
        position={[0, 6.5, 5.5]}
        angle={0.7}
        penumbra={0.8}
        intensity={60}
        color="#FFE8D6"
      />
      {/* Relleno cobre bajo, pegado al muro — el glow de la sala */}
      <pointLight position={[0, 0.6, -2]} intensity={14} color={SALA_COLORS.copper} distance={12} />
      {/* Rims laterales fríos para separar volúmenes */}
      <pointLight position={[-7, 2.5, 0]} intensity={6} color="#3A4A6B" distance={14} />
      <pointLight position={[7, 2.5, 0]} intensity={6} color="#3A4A6B" distance={14} />
    </>
  );
}

function Floor() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
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

/** Casquete cilíndrico interior: la superficie del muro de pantallas */
function WallShell() {
  const arc = (100 * Math.PI) / 180;
  const thetaStart = Math.PI - arc / 2;
  return (
    <mesh position={[WALL_ARC.cx, 3, WALL_ARC.cz]}>
      <cylinderGeometry args={[WALL_ARC.radius + 0.25, WALL_ARC.radius + 0.25, 7, 96, 1, true, thetaStart, arc]} />
      <meshStandardMaterial color={SALA_COLORS.wall} roughness={0.92} metalness={0.25} side={THREE.BackSide} />
    </mesh>
  );
}

/** Referencias visuales temporales de F1 (se sustituyen por la sala real) */
function PlaceholderProps() {
  return (
    <>
      {/* Línea de luz superior del muro */}
      <mesh position={[0, 3.6, -3.1]}>
        <boxGeometry args={[9.5, 0.05, 0.05]} />
        <meshStandardMaterial
          color={SALA_COLORS.screenOff}
          emissive={SALA_COLORS.copper}
          emissiveIntensity={2.2}
        />
      </mesh>
      {/* Anillo del operador en el suelo */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 3.2]}>
        <torusGeometry args={[1.15, 0.015, 8, 96]} />
        <meshStandardMaterial
          color={SALA_COLORS.screenOff}
          emissive={SALA_COLORS.copper}
          emissiveIntensity={1.6}
        />
      </mesh>
      {/* Pilar del futuro Núcleo */}
      <mesh position={[0, 1.4, -1.6]}>
        <cylinderGeometry args={[0.045, 0.045, 2.8, 24]} />
        <meshStandardMaterial
          color={SALA_COLORS.screenOff}
          emissive={SALA_COLORS.copperDark}
          emissiveIntensity={1.8}
        />
      </mesh>
    </>
  );
}
