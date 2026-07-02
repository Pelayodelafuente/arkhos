"use client";

// ══════════════════════════════════════
// Arkhos OPS — experiencia 3D (Canvas R3F)
// Composición de la escena: habitación + consola + luces + postpro + rig
// de cámara. El contenido de las pantallas llega en F3.
// ══════════════════════════════════════

import { Canvas } from "@react-three/fiber";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { SALA_COLORS } from "@/lib/sala/palette";
import { Lighting } from "./environment/lighting";
import { Room } from "./environment/room";
import { OperatorConsole } from "./environment/console";
import { SalaEffects } from "./environment/effects";
import { CameraRig, CAMERA_INTRO_POS } from "./interaction/camera-rig";

export function SalaExperience() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: CAMERA_INTRO_POS, fov: 42 }}
    >
      <color attach="background" args={[SALA_COLORS.bg]} />
      <fog attach="fog" args={[SALA_COLORS.fog, 10, 28]} />
      <CameraRig reducedMotion={reducedMotion} />
      <Lighting />
      <Room />
      <OperatorConsole />
      <NucleoPlaceholder />
      <SalaEffects />
    </Canvas>
  );
}

/** Pilar de luz provisional: aquí vivirá el Núcleo del patrimonio (F6) */
function NucleoPlaceholder() {
  return (
    <mesh position={[0, 1.5, -1.4]}>
      <cylinderGeometry args={[0.045, 0.045, 3, 24]} />
      <meshStandardMaterial
        color={SALA_COLORS.screenOff}
        emissive={SALA_COLORS.copperDark}
        emissiveIntensity={1.8}
      />
    </mesh>
  );
}
