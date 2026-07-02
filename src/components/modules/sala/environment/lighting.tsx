"use client";

// ══════════════════════════════════════
// Arkhos OPS — rig de iluminación
// Tres capas: key cálida cenital sobre el operador, glow cobre desde la
// base del muro (la luz "de las pantallas") y rims fríos laterales para
// separar volúmenes del fondo.
// ══════════════════════════════════════

import { SALA_COLORS } from "@/lib/sala/palette";

export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.13} />
      <spotLight
        position={[0, 6.5, 5.5]}
        angle={0.7}
        penumbra={0.85}
        intensity={55}
        color="#FFE8D6"
      />
      <pointLight
        position={[0, 0.7, -1.8]}
        intensity={8}
        color={SALA_COLORS.copper}
        distance={10}
        decay={2}
      />
      <pointLight position={[-7, 2.6, 0.5]} intensity={7} color="#38486B" distance={15} decay={2} />
      <pointLight position={[7, 2.6, 0.5]} intensity={7} color="#38486B" distance={15} decay={2} />
      {/* Luz de rebote muy tenue desde el suelo reflectante */}
      <pointLight position={[0, 0.2, 3]} intensity={1.2} color={SALA_COLORS.copperDark} distance={6} decay={2} />
    </>
  );
}
