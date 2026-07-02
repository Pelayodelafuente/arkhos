"use client";

// ══════════════════════════════════════
// Arkhos OPS — fallback 2D "flat ops"
// Se muestra cuando no hay WebGL fiable o en viewports pequeños.
// v1: placeholder digno; se completa en la fase de pulido con el mismo
// registro de widgets que el muro 3D.
// ══════════════════════════════════════

export function SalaFallback() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-[10px] tracking-[0.4em] text-[var(--sala-copper)]">
        MODO PLANO
      </p>
      <h1 className="font-heading text-3xl text-[var(--sala-text)]">Arkhos OPS</h1>
      <p className="max-w-sm text-sm text-[var(--sala-text-dim)]">
        Este dispositivo no puede renderizar la sala 3D. La vista plana del
        centro de mando estará disponible aquí.
      </p>
    </div>
  );
}
