"use client";

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { RISK_COLORS, RISK_LABELS } from "@/types/patrimonio";
import type { RiskLevel } from "@/types/patrimonio";

// ---------------------------------------------------------------------------
// Numeric risk mapping
// ---------------------------------------------------------------------------

const RISK_NUMERIC: Record<RiskLevel, number> = {
  very_low: 1,
  low: 2,
  medium: 3,
  high: 4,
  very_high: 5,
};

const RISK_TICK_LABELS: Record<number, string> = {
  1: "Muy bajo",
  2: "Bajo",
  3: "Medio",
  4: "Alto",
  5: "Muy alto",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScatterPoint {
  x: number;
  y: number;
  z: number;
  name: string;
  ticker?: string;
  riskLevel: RiskLevel;
  color: string;
}

// ---------------------------------------------------------------------------
// Custom shapes
// ---------------------------------------------------------------------------

interface CircleShapeProps {
  cx: number;
  cy: number;
  payload: ScatterPoint;
}

function CircleShape(rawProps: unknown) {
  // @ts-ignore
  const props = rawProps as CircleShapeProps;
  const { cx, cy, payload } = props;
  const r = Math.max(4, Math.min(20, payload.z * 0.4));
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={payload.color}
      fillOpacity={0.7}
      stroke={payload.color}
      strokeWidth={1}
    />
  );
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

interface ScatterTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ScatterPoint }>;
}

function ScatterTooltip({ active, payload }: ScatterTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const sign = point.y >= 0 ? "+" : "";
  const color = point.y >= 0 ? "var(--color-gain, #2E7D6B)" : "var(--color-loss, #A32D2D)";

  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-md"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
      }}
    >
      <p className="mb-1 font-semibold">{point.name}</p>
      {point.ticker && (
        <p className="mb-1" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
          {point.ticker}
        </p>
      )}
      <div className="space-y-0.5">
        <p>
          Riesgo:{" "}
          <span style={{ color: point.color, fontWeight: 600 }}>
            {RISK_LABELS[point.riskLevel]}
          </span>
        </p>
        <p>
          P&amp;L:{" "}
          <span style={{ color, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
            {sign}{point.y.toFixed(2)}%
          </span>
        </p>
        <p style={{ color: "var(--text-secondary)" }}>
          Peso en cartera:{" "}
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {point.z.toFixed(1)}%
          </span>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RiskReturnScatter() {
  const assets = usePatrimonioStore((s) => s.assets);

  const scatterData: ScatterPoint[] = useMemo(() => {
    const investmentAssets = assets.filter(
      (a) => a.category !== "cash" && a.pl_percentage != null
    );
    if (investmentAssets.length === 0) return [];

    const totalValue = investmentAssets.reduce(
      (sum, a) => sum + (a.current_value ?? 0),
      0
    );

    return investmentAssets.map((a) => {
      const weight =
        totalValue > 0 ? ((a.current_value ?? 0) / totalValue) * 100 : 0;
      return {
        x: RISK_NUMERIC[a.risk_level],
        y: a.pl_percentage ?? 0,
        z: weight,
        name: a.name,
        ticker: a.ticker,
        riskLevel: a.risk_level,
        color: RISK_COLORS[a.risk_level],
      };
    });
  }, [assets]);

  if (scatterData.length < 3) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Se necesitan al menos 3 activos con datos de P&amp;L para mostrar el gráfico.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ScatterChart margin={{ top: 20, right: 20, left: -20, bottom: 8 }}>
        <CartesianGrid
          stroke="var(--border)"
          strokeOpacity={0.4}
        />
        <XAxis
          type="number"
          dataKey="x"
          domain={[0.5, 5.5]}
          tickCount={5}
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => RISK_TICK_LABELS[Math.round(v)] ?? ""}
        />
        <YAxis
          type="number"
          dataKey="y"
          tick={{ fontSize: 10, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}%`}
          domain={["auto", "auto"]}
        />
        <ReferenceLine
          y={0}
          stroke="var(--border)"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter
          data={scatterData}
          // @ts-ignore — shape prop accepts custom render function
          shape={CircleShape}
          isAnimationActive={false}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
