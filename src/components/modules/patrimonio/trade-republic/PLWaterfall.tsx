"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import type { PLBarItem } from "@/types/patrimonio";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

// ---------------------------------------------------------------------------
// Waterfall bar shape
// ---------------------------------------------------------------------------

interface WaterfallDataPoint {
  name: string;
  ticker: string;
  base: number;
  display: number;
  pl_amount: number;
  pl_percentage: number;
  isGain: boolean;
}

function buildWaterfallData(items: PLBarItem[]): WaterfallDataPoint[] {
  // Sort by pl_amount descending: gains first, then losses
  const sorted = [...items].sort((a, b) => b.pl_amount - a.pl_amount);

  return sorted.map((item) => {
    const isGain = item.pl_amount >= 0;
    return {
      name: item.name,
      ticker: item.ticker,
      base: isGain ? 0 : item.pl_amount,
      display: Math.abs(item.pl_amount),
      pl_amount: item.pl_amount,
      pl_percentage: item.pl_percentage,
      isGain,
    };
  });
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: WaterfallDataPoint }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  // Payload index 1 = the visible bar (display)
  const item = payload[payload.length - 1]?.payload;
  if (!item) return null;

  const color = item.isGain ? "var(--color-gain, #2E7D6B)" : "var(--color-loss, #A32D2D)";
  const sign = item.isGain ? "+" : "";

  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-md"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <p className="mb-1 font-semibold">{item.name}</p>
      {item.ticker && (
        <p className="mb-1" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
          {item.ticker}
        </p>
      )}
      <p style={{ color }}>
        {sign}{fmt(item.pl_amount)}{" "}
        <span style={{ fontFamily: "var(--font-mono)" }}>
          ({sign}{item.pl_percentage.toFixed(2)}%)
        </span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PLWaterfall() {
  const getPLBarData = usePatrimonioStore((s) => s.getPLBarData);
  const rawData = getPLBarData();

  const data = useMemo(() => buildWaterfallData(rawData), [rawData]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Sin datos de P&amp;L disponibles
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
        barCategoryGap="30%"
      >
        <CartesianGrid
          vertical={false}
          stroke="var(--border)"
          strokeOpacity={0.5}
        />
        <XAxis
          dataKey="ticker"
          tick={{ fontSize: 10, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => v.substring(0, 8)}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
          }
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
        <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />

        {/* Transparent offset bar — creates the floating effect */}
        <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />

        {/* Visible bar */}
        <Bar dataKey="display" stackId="a" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.isGain ? "#2E7D6B" : "#A32D2D"}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
