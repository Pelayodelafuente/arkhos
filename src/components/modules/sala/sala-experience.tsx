"use client";

// ══════════════════════════════════════
// Arkhos OPS — experiencia 3D (Canvas R3F)
// Composición de la escena: habitación + consola + luces + postpro + rig
// de cámara. El contenido de las pantallas llega en F3.
// ══════════════════════════════════════

import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { SALA_COLORS } from "@/lib/sala/palette";
import { useSalaStore } from "@/stores/sala-store";
import { Lighting } from "./environment/lighting";
import { Room } from "./environment/room";
import { OperatorConsole } from "./environment/console";
import { SalaEffects } from "./environment/effects";
import { Nucleo } from "./environment/nucleo";
import { ServerRacks } from "./environment/server-racks";
import { Vault } from "./environment/vault";
import { MarketTicker } from "./environment/ticker";
import { Atmosphere } from "./environment/atmosphere";
import { ScreenWall } from "./screens/screen-wall";
import { CameraRig, CAMERA_INTRO_POS } from "./interaction/camera-rig";
import { DragController } from "./interaction/drag-controller";

export function SalaExperience() {
  const reducedMotion = usePrefersReducedMotion();
  const hydrateLayout = useSalaStore((s) => s.hydrateLayout);

  // Layout guardado (localStorage) — solo disponible en cliente
  useEffect(() => {
    hydrateLayout();
  }, [hydrateLayout]);

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
      <ScreenWall />
      <Nucleo reducedMotion={reducedMotion} />
      <ServerRacks reducedMotion={reducedMotion} />
      <Vault />
      <MarketTicker />
      <Atmosphere reducedMotion={reducedMotion} />
      <DragController />
      <SalaEffects />
    </Canvas>
  );
}
