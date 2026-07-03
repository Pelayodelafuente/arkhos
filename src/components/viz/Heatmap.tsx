"use client";

import { useState } from "react";
import { formatPct } from "@/lib/utils/format";
import { ChartTooltipFrame } from "./ChartTooltip";

/**
 * Heatmap unificado (Fase 0.2 — fundación viz).
 *
 * Unifica los dos heatmaps de retorno previos (uno en D3, otro en CSS) en una
 * sola implementación CSS-grid con UNA escala de color divergente canónica
 * (negativo → rojo, cero → crema, positivo → verde) normalizada sobre el
 * |valor máximo absoluto|. Tipografía de celda en font-mono tabular-nums.
 *
 * Nota: el "cero" usa un crema visible (`--bg-sand` aprox) en lugar de blanco
 * puro para que las celdas no desaparezcan sobre la tarjeta (bg-card).
 */
export interface HeatmapCell {
  label: string;
  value: number | null;
}

export interface HeatmapRow {
  label: string;
  cells: HeatmapCell[];
}

interface HeatmapColorScale {
  negative: string;
  zero: string;
  positive: string;
}

interface HeatmapProps {
  rows: HeatmapRow[];
  /** Etiquetas de columna. Si se omite, se usan las de `cells` de la primera fila. */
  columns?: string[];
  colorScale?: HeatmapColorScale;
  valueFormatter?: (v: number) => string;
  className?: string;
}

const DEFAULT_SCALE: HeatmapColorScale = {
  negative: "var(--color-loss)",
  zero: "var(--bg-sand)",
  positive: "var(--color-gain)",
};

// Interpolación vía CSS color-mix: acepta hex y var(--token), y así el
// heatmap sigue el tema claro/oscuro sin resolver colores en JS.
function mix(a: string, b: string, t: number): string {
  return `color-mix(in srgb, ${b} ${Math.round(t * 100)}%, ${a})`;
}

interface HoverState {
  rowLabel: string;
  cellLabel: string;
  value: number;
  x: number;
  y: number;
}

export function Heatmap({
  rows,
  columns,
  colorScale = DEFAULT_SCALE,
  valueFormatter = (v) => formatPct(v, true, 1),
  className = "",
}: HeatmapProps) {
  const [hover, setHover] = useState<HoverState | null>(null);

  if (rows.length === 0) return null;

  const cols = columns ?? rows[0].cells.map((c) => c.label);
  const colCount = cols.length;

  // Escala normalizada sobre el |valor| máximo de toda la matriz.
  let maxAbs = 0;
  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.value !== null && Math.abs(cell.value) > maxAbs) maxAbs = Math.abs(cell.value);
    }
  }
  const safeMax = maxAbs || 1;

  const cellBg = (value: number): string => {
    const t = Math.max(-1, Math.min(1, value / safeMax));
    return t >= 0
      ? mix(colorScale.zero, colorScale.positive, t)
      : mix(colorScale.zero, colorScale.negative, -t);
  };
  const cellText = (value: number): string =>
    Math.abs(value) / safeMax > 0.55 ? "#fff" : "var(--text-secondary)";

  const gridTemplate = `3rem repeat(${colCount}, 1fr)`;

  return (
    <div className={`relative overflow-x-auto ${className}`}>
      {/* Cabecera de columnas */}
      <div className="mb-1 grid items-center" style={{ gridTemplateColumns: gridTemplate }}>
        <div />
        {cols.map((c) => (
          <div key={c} className="text-center text-xs font-medium text-text-tertiary">
            {c}
          </div>
        ))}
      </div>

      {/* Filas */}
      <div className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid items-center"
            style={{ gridTemplateColumns: gridTemplate, gap: "3px" }}
          >
            <div className="pr-2 text-right font-mono text-xs font-medium text-text-secondary">
              {row.label}
            </div>
            {row.cells.map((cell, i) => {
              const isEmpty = cell.value === null;
              return (
                <div
                  key={`${row.label}-${cols[i] ?? i}`}
                  className="flex h-8 cursor-default items-center justify-center rounded font-mono text-xs tabular-nums transition-[border-color]"
                  style={{
                    backgroundColor: isEmpty ? "var(--bg-sand)" : cellBg(cell.value as number),
                    color: isEmpty ? "var(--text-tertiary)" : cellText(cell.value as number),
                    opacity: isEmpty ? 0.4 : 1,
                    border: "1.5px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (isEmpty) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.borderColor = "var(--accent-terracotta)";
                    setHover({
                      rowLabel: row.label,
                      cellLabel: cols[i] ?? cell.label,
                      value: cell.value as number,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "transparent";
                    setHover(null);
                  }}
                  aria-label={
                    isEmpty
                      ? `${cols[i] ?? cell.label} ${row.label}: sin datos`
                      : `${cols[i] ?? cell.label} ${row.label}: ${valueFormatter(cell.value as number)}`
                  }
                >
                  {isEmpty ? "—" : valueFormatter(cell.value as number)}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Tooltip flotante */}
      {hover && (
        <div
          className="pointer-events-none fixed z-50"
          style={{ left: hover.x, top: hover.y - 8, transform: "translate(-50%, -100%)" }}
        >
          <ChartTooltipFrame>
            <p className="font-medium text-text-secondary">
              {hover.cellLabel} {hover.rowLabel}
            </p>
            <p
              className="mt-0.5 font-mono font-semibold tabular-nums"
              style={{ color: hover.value >= 0 ? colorScale.positive : colorScale.negative }}
            >
              {valueFormatter(hover.value)}
            </p>
          </ChartTooltipFrame>
        </div>
      )}
    </div>
  );
}
