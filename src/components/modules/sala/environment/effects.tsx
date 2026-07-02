"use client";

// ══════════════════════════════════════
// Arkhos OPS — postprocesado
// Un único EffectComposer: bloom (solo materiales HDR con emissive > 1),
// grano sutil y viñeta. En calidad "media" se omite por completo.
// ══════════════════════════════════════

import { EffectComposer, Bloom, Noise, Vignette } from "@react-three/postprocessing";
import { useSalaStore } from "@/stores/sala-store";

export function SalaEffects() {
  const quality = useSalaStore((s) => s.quality);
  if (quality === "media") return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={0.85} luminanceThreshold={1} luminanceSmoothing={0.25} />
      <Noise opacity={0.018} />
      <Vignette eskil={false} offset={0.16} darkness={0.82} />
    </EffectComposer>
  );
}
