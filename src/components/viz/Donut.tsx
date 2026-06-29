"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { largestRemainder, formatEur } from "@/lib/utils/format";

/**
 * Donut unificado (Fase 0.2 — fundación viz).
 *
 * Base: trade-republic/AllocationDonut. Sustituye a los donuts independientes
 * (asignación, riesgo, geografía, sector, cripto, préstamos Mintos).
 *
 * - Centro dinámico al hover: nombre del segmento + valor + %.
 * - Sin hover: `centerLabel`/`centerValue` o el total con etiqueta "Total".
 * - Tooltip flotante con <ChartTooltip>.
 * - Leyenda: punto de color (radio 3px) + nombre + valor + %.
 * - Porcentajes con `largestRemainder` para que sumen 100.
 */
export interface DonutDatum {
  name: string;
  value: number;
  color: string;
}

interface DonutProps {
  data: DonutDatum[];
  /** Etiqueta central fija (sin hover). Por defecto "Total". */
  centerLabel?: string;
  /** Valor central fijo (sin hover). Por defecto el total formateado. */
  centerValue?: string;
  /** Leyenda con nombre + valor + % (true por defecto). */
  showLegend?: boolean;
  /** Formateador del valor en centro, tooltip y leyenda (por defecto formatEur). */
  valueFormatter?: (v: number) => string;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  className?: string;
}

const fmtPctComma = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;

export function Donut({
  data,
  centerLabel,
  centerValue,
  showLegend = true,
  valueFormatter = formatEur,
  height = 200,
  innerRadius = 58,
  outerRadius = 84,
  className = "",
}: DonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);
  const withPct = useMemo(
    () =>
      largestRemainder(
        data.map((d) => ({
          ...d,
          percentage: total > 0 ? (d.value / total) * 100 : 0,
        }))
      ),
    [data, total]
  );

  if (data.length === 0 || total <= 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ minHeight: height }}
      >
        <p className="text-sm text-text-tertiary">Sin datos</p>
      </div>
    );
  }

  const active = activeIndex !== null ? withPct[activeIndex] : null;

  return (
    <div className={className}>
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
              onMouseEnter={(_, i) => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.name}
                  fill={d.color}
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.45}
                  style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Centro dinámico */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          {active ? (
            <>
              <span className="max-w-[100px] truncate text-center font-mono text-[10px] text-text-tertiary">
                {active.name}
              </span>
              <span className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
                {valueFormatter(active.value)}
              </span>
            </>
          ) : (
            <>
              <span className="font-mono text-xs text-text-tertiary">
                {centerLabel ?? "Total"}
              </span>
              <span className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
                {centerValue ?? valueFormatter(total)}
              </span>
            </>
          )}
        </div>
      </div>

      {showLegend && (
        <ul className="mt-3 space-y-1.5">
          {withPct.map((d, i) => (
            <li
              key={d.name}
              className="flex items-center justify-between gap-2 transition-opacity"
              style={{ opacity: activeIndex === null || activeIndex === i ? 1 : 0.45 }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-[3px]"
                  style={{ backgroundColor: d.color }}
                  aria-hidden="true"
                />
                <span className="truncate text-xs text-text-secondary">{d.name}</span>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="font-mono text-xs tabular-nums text-text-tertiary">
                  {valueFormatter(d.value)}
                </span>
                <span className="w-10 text-right font-mono text-xs tabular-nums text-text-tertiary">
                  {fmtPctComma(d.percentage)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
