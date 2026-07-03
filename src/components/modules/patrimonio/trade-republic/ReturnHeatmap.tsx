"use client";

import { useMemo } from "react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { Heatmap } from "@/components/viz";
import type { HeatmapRow } from "@/components/viz";
import type { PortfolioSnapshot } from "@/types/patrimonio";

const MONTHS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

// total_value ya es el valor de cartera (sin cash)
function investmentValue(s: PortfolioSnapshot): number {
  return s.total_value;
}

// Construye filas (año) × 12 meses con el retorno mensual cashflow-adjusted.
function buildRows(snapshots: PortfolioSnapshot[]): HeatmapRow[] {
  if (snapshots.length < 2) return [];

  // Agrupar por YYYY-MM, quedándose con el último snapshot de cada mes
  const byMonth = new Map<string, PortfolioSnapshot>();
  for (const s of snapshots) {
    const key = s.snapshot_date.substring(0, 7);
    const existing = byMonth.get(key);
    if (!existing || s.snapshot_date > existing.snapshot_date) {
      byMonth.set(key, s);
    }
  }

  const sortedKeys = Array.from(byMonth.keys()).sort();

  // Retorno mensual ajustado por cashflow (≈ 1 periodo TWR):
  //   adjustedReturn = (endValue - cashFlow - startValue) / startValue
  const returnByMonth = new Map<string, number>();
  for (let i = 1; i < sortedKeys.length; i++) {
    const prev = byMonth.get(sortedKeys[i - 1]);
    const curr = byMonth.get(sortedKeys[i]);
    if (!prev || !curr) continue;
    const prevVal = investmentValue(prev);
    const currVal = investmentValue(curr);
    if (prevVal <= 0) continue;
    const cashFlow = curr.total_invested - prev.total_invested;
    const pct = ((currVal - cashFlow - prevVal) / prevVal) * 100;
    if (!isFinite(pct) || isNaN(pct)) continue;
    returnByMonth.set(sortedKeys[i], parseFloat(pct.toFixed(2)));
  }

  const allYears = sortedKeys.map((k) => parseInt(k.substring(0, 4), 10));
  const minYear = Math.min(...allYears);
  const maxYear = Math.max(...allYears);

  const rows: HeatmapRow[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    const cells = Array.from({ length: 12 }, (_, m) => {
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      return {
        label: MONTHS[m],
        value: returnByMonth.has(key) ? returnByMonth.get(key)! : null,
      };
    });
    rows.push({ label: String(y), cells });
  }

  return rows;
}

export function ReturnHeatmap() {
  const snapshots = usePatrimonioStore((s) => s.snapshots);
  const rows = useMemo(() => buildRows(snapshots), [snapshots]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Sin datos suficientes
        </p>
        <p className="max-w-xs text-xs" style={{ color: "var(--text-tertiary)" }}>
          Se necesitan al menos 2 snapshots de meses distintos para calcular retornos.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Heatmap rows={rows} columns={MONTHS} />

      {/* Leyenda: rampa divergente canónica */}
      <div
        className="mt-4 flex flex-wrap items-center gap-3 text-xs"
        style={{ color: "var(--text-tertiary)" }}
      >
        <span>Retorno mensual:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded-sm" style={{ backgroundColor: "var(--color-loss)" }} />
          negativo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded-sm" style={{ backgroundColor: "var(--bg-sand)" }} />
          ~0%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded-sm" style={{ backgroundColor: "var(--color-gain)" }} />
          positivo
        </span>
      </div>
    </div>
  );
}
