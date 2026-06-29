"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { formatPct } from "@/lib/utils/format";
import { ChartShell, ChartTooltip, useCrosshair } from "@/components/viz";
import type { ChartTooltipProps } from "@/components/viz";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

/**
 * Curva de drawdown (underwater) — Fase 2.1.
 * Conecta `getDrawdownSeries()` del store (ya existía `getMaxDrawdown`, sin pintar).
 * La serie es siempre ≤ 0 (caída desde el máximo de la curva TWR).
 */
export function DrawdownChart() {
  const getDrawdownSeries = usePatrimonioStore((s) => s.getDrawdownSeries);
  const snapshots = usePatrimonioStore((s) => s.snapshots);

  // Patrón reactivo seguro (sin `void x` en el cuerpo, que React Compiler eliminaría).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => getDrawdownSeries(), [snapshots, getDrawdownSeries]);

  const { activeIndex, chartProps } = useCrosshair();
  const reduced = usePrefersReducedMotion();

  if (data.length < 2) {
    return (
      <ChartShell title="Drawdown" subtitle="Caída desde máximo histórico">
        <div className="flex h-40 items-center justify-center">
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Se necesitan al menos 2 meses de snapshots para calcular el drawdown.
          </p>
        </div>
      </ChartShell>
    );
  }

  const maxDD = Math.min(...data.map((p) => p.value));

  return (
    <ChartShell
      title="Drawdown"
      subtitle="Caída desde máximo histórico (sobre curva TWR)"
      actions={
        <span className="font-mono text-xs font-semibold tabular-nums" style={{ color: "#A32D2D" }}>
          Máx {formatPct(maxDD, true)}
        </span>
      }
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }} {...chartProps}>
          <defs>
            <linearGradient id="gradDrawdown" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#A32D2D" stopOpacity={0} />
              <stop offset="95%" stopColor="#A32D2D" stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={["dataMin", 0]}
            tickFormatter={(v: number) => formatPct(v, false, 0)}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            content={(props) => (
              <ChartTooltip
                {...(props as unknown as ChartTooltipProps)}
                nameFormatter={() => "Drawdown"}
                valueFormatter={(v) => formatPct(v, true)}
              />
            )}
            cursor={false}
          />
          <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
          {activeIndex != null && data[activeIndex] && (
            <ReferenceLine
              x={data[activeIndex].label}
              stroke="var(--text-tertiary)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            isAnimationActive={!reduced}
            animationDuration={500}
            stroke="#A32D2D"
            strokeWidth={1.5}
            fill="url(#gradDrawdown)"
            baseValue={0}
            dot={false}
            activeDot={{ r: 4, fill: "#A32D2D" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
