"use client";

// ══════════════════════════════════════
// Arkhos OPS — shell de la sala
// Contenedor fullscreen por encima del layout (docks incluidos), detección
// de capacidades y carga diferida de la experiencia 3D (three solo entra
// en el bundle de /sala).
// ══════════════════════════════════════

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useSalaStore } from "@/stores/sala-store";
import { SalaFallback } from "./sala-fallback";
import { SalaHud } from "./sala-hud";
import { useSalaAudio } from "./audio/use-sala-audio";

const SalaExperience = dynamic(
  () => import("./sala-experience").then((m) => m.SalaExperience),
  { ssr: false, loading: () => <SalaBooting /> }
);

type SalaMode = "detecting" | "3d" | "flat";

function detectMode(): SalaMode {
  if (new URLSearchParams(window.location.search).get("flat") === "1") return "flat";
  // Móvil/tablet: el drag 3D y el coste GPU no compensan — flat ops
  if (window.matchMedia("(max-width: 1023px)").matches) return "flat";
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ??
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true });
    return gl ? "3d" : "flat";
  } catch {
    return "flat";
  }
}

export function SalaShell() {
  const router = useRouter();
  const [mode, setMode] = useState<SalaMode>("detecting");
  useSalaAudio();

  // La detección necesita window: se resuelve tras el primer render (SSR-safe)
  useEffect(() => {
    setMode(detectMode());
  }, []);

  // Esc: salir del modo foco
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        useSalaStore.getState().setFocusedSlot(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--sala-bg)] text-[var(--sala-text)]">
      {mode === "3d" && <SalaExperience />}
      {mode === "flat" && <SalaFallback />}
      {mode === "detecting" && <SalaBooting />}
      {mode !== "detecting" && <SalaHud />}

      <button
        type="button"
        onClick={() => router.push("/")}
        aria-label="Salir de la sala"
        className="absolute right-4 top-4 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-[var(--sala-border)] bg-[var(--sala-surface)] text-[var(--sala-text-dim)] transition-colors duration-200 hover:border-[var(--sala-copper)] hover:text-[var(--sala-copper)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function SalaBooting() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--sala-bg)]">
      <div className="flex flex-col items-center gap-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--sala-copper)]" />
        <p className="font-mono text-xs tracking-[0.3em] text-[var(--sala-text-dim)]">
          INICIANDO ARKHOS OPS
        </p>
      </div>
    </div>
  );
}
