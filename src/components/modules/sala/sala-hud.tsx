"use client";

// ══════════════════════════════════════
// Arkhos OPS — HUD del operador
// Barra de control diegética inferior: wordmark, reloj, sonido, calidad
// y reset del layout. DOM puro por encima del canvas.
// ══════════════════════════════════════

import { useEffect, useState } from "react";
import { Volume2, VolumeX, Gauge, RotateCcw } from "lucide-react";
import { useSalaStore } from "@/stores/sala-store";

export function SalaHud() {
  const soundOn = useSalaStore((s) => s.soundOn);
  const toggleSound = useSalaStore((s) => s.toggleSound);
  const quality = useSalaStore((s) => s.quality);
  const setQuality = useSalaStore((s) => s.setQuality);
  const resetLayout = useSalaStore((s) => s.resetLayout);

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4 rounded-lg border border-[var(--sala-border)] bg-[rgba(7,7,13,0.82)] px-4 py-2 backdrop-blur-sm">
      <span className="font-heading text-sm tracking-wide text-[var(--sala-copper)]">
        ARKHOS <span className="text-[var(--sala-text-dim)]">OPS</span>
      </span>
      <Divider />
      <Clock />
      <Divider />
      <HudButton
        label={soundOn ? "Silenciar" : "Activar sonido"}
        active={soundOn}
        onClick={toggleSound}
      >
        {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
      </HudButton>
      <HudButton
        label={quality === "alta" ? "Calidad alta (postpro on)" : "Calidad media (postpro off)"}
        active={quality === "alta"}
        onClick={() => setQuality(quality === "alta" ? "media" : "alta")}
      >
        <Gauge className="h-3.5 w-3.5" />
      </HudButton>
      <HudButton label="Restaurar layout del muro" active={false} onClick={resetLayout}>
        <RotateCcw className="h-3.5 w-3.5" />
      </HudButton>
    </div>
  );
}

function Divider() {
  return <span className="h-4 w-px bg-[var(--sala-border)]" />;
}

function HudButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded border transition-colors duration-150 ${
        active
          ? "border-[var(--sala-copper)] text-[var(--sala-copper)]"
          : "border-[var(--sala-border)] text-[var(--sala-text-dim)] hover:border-[var(--sala-copper)] hover:text-[var(--sala-copper)]"
      }`}
    >
      {children}
    </button>
  );
}

function Clock() {
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const format = () =>
      new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    setNow(format());
    const id = window.setInterval(() => setNow(format()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="financial-number text-xs text-[var(--sala-text)]" suppressHydrationWarning>
      {now}
    </span>
  );
}
