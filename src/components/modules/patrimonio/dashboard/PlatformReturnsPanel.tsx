"use client";

import { Percent } from "lucide-react";
import { formatPct } from "@/lib/utils/format";

/**
 * Desglose de rentabilidad por plataforma (Bug #1).
 *
 * NO promedia métricas heterogéneas (CAGR/TWR/P&L%/XIRR). Muestra la rentabilidad
 * real de cada plataforma con su tipo de métrica y color semántico. Bloque
 * presentacional reutilizable (el contenedor/borde lo pone el caller).
 */
export interface PlatformReturn {
  name: string;
  color: string;
  /** Tipo de métrica: CAGR · TWR · P&L · XIRR. */
  metric: string;
  /** Valor en % (ya en %, no decimal). `null` → "—". */
  value: number | null;
}

export function PlatformReturnsPanel({ returns }: { returns: PlatformReturn[] }) {
  return (
    <div className="px-2.5 py-4 sm:px-5">
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-lg"
          style={{ backgroundColor: "color-mix(in srgb, #7260C4 12%, transparent)", color: "#7260C4" }}
          aria-hidden="true"
        >
          <Percent size={13} strokeWidth={1.75} />
        </span>
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          Rentabilidad por plataforma
        </span>
      </div>
      <ul className="space-y-1.5">
        {returns.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-[3px]"
                style={{ backgroundColor: r.color }}
                aria-hidden="true"
              />
              <span className="truncate text-xs" style={{ color: "var(--text-secondary)" }}>{r.name}</span>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>{r.metric}</span>
            </div>
            <span
              className="font-mono text-xs font-semibold tabular-nums"
              style={{ color: r.value === null ? "var(--text-tertiary)" : r.value >= 0 ? "#2E7D6B" : "#A32D2D" }}
            >
              {r.value === null ? "—" : formatPct(r.value, true)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
