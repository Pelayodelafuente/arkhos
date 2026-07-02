"use client";

// Drawdown underwater — selectores del store de Patrimonio

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { MODULE_HEX } from "@/lib/sala/palette";
import { fmtPct } from "@/lib/sala/format";
import { WidgetShell } from "./widget-shell";
import { SALA_TOOLTIP_STYLE, SALA_TICK, SALA_GRID_STROKE, type SalaWidgetProps } from "./types";

const LOSS = "#D06565";

export function WidgetDrawdown({ width, height }: SalaWidgetProps) {
  const getDrawdownSeries = usePatrimonioStore((s) => s.getDrawdownSeries);
  const snapshots = usePatrimonioStore((s) => s.snapshots);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const series = useMemo(() => getDrawdownSeries(), [snapshots, getDrawdownSeries]);
  const maxDrawdown = usePatrimonioStore((s) => s.getMaxDrawdown());
  const chartH = Math.max(60, height - 40);

  return (
    <WidgetShell
      title="Patrimonio · Drawdown"
      accent={MODULE_HEX.patrimonio}
      headerRight={
        <span className="font-mono text-[10px] text-[var(--sala-loss)]">
          MAX {fmtPct(maxDrawdown !== null ? -Math.abs(maxDrawdown) : null)}
        </span>
      }
    >
      {series.length > 1 ? (
        <AreaChart width={width} height={chartH} data={series} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="sala-dd-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LOSS} stopOpacity={0.03} />
              <stop offset="100%" stopColor={LOSS} stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={SALA_GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="label"
            tick={SALA_TICK}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={["auto", 0]} />
          <Tooltip
            isAnimationActive={false}
            contentStyle={SALA_TOOLTIP_STYLE}
            formatter={(value) => fmtPct(Number(value))}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={LOSS}
            strokeWidth={1.6}
            fill="url(#sala-dd-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      ) : (
        <p className="pt-4 font-mono text-[10px] text-[var(--sala-text-dim)]">SIN HISTORIAL</p>
      )}
    </WidgetShell>
  );
}
