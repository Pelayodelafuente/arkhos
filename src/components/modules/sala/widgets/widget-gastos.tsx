"use client";

// Gasto mensual — store de Gastos (hidratado en la megacarga)

import { useMemo } from "react";
import { Bar, BarChart, Tooltip, XAxis, YAxis } from "recharts";
import { useExpensesStore } from "@/stores/expenses-store";
import { MODULE_HEX } from "@/lib/sala/palette";
import { fmtEur, monthShort } from "@/lib/sala/format";
import { WidgetShell } from "./widget-shell";
import { SALA_TOOLTIP_STYLE, SALA_TICK, type SalaWidgetProps } from "./types";

export function WidgetGastos({ width, height }: SalaWidgetProps) {
  const monthlySpending = useExpensesStore((s) => s.monthlySpending);

  const series = useMemo(
    () =>
      [...monthlySpending]
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6)
        .map((m) => ({ label: monthShort(`${m.month}-01`), total: m.total })),
    [monthlySpending]
  );

  const current = series[series.length - 1];
  const chartH = Math.max(50, height - 46);

  return (
    <WidgetShell title="Gastos · Mes" accent={MODULE_HEX.gastos}>
      <div className="flex items-baseline gap-2 pb-1">
        <span className="financial-number text-xl text-[var(--sala-text)]">
          {fmtEur(current?.total ?? null)}
        </span>
        <span className="font-mono text-[9px] uppercase text-[var(--sala-text-dim)]">
          {current ? current.label : ""}
        </span>
      </div>
      {series.length > 0 ? (
        <BarChart width={width} height={chartH} data={series} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <XAxis dataKey="label" tick={SALA_TICK} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            isAnimationActive={false}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={SALA_TOOLTIP_STYLE}
            formatter={(value) => fmtEur(Number(value))}
          />
          <Bar
            dataKey="total"
            fill={MODULE_HEX.gastos}
            fillOpacity={0.75}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      ) : (
        <p className="pt-2 font-mono text-[10px] text-[var(--sala-text-dim)]">SIN PAGOS</p>
      )}
    </WidgetShell>
  );
}
