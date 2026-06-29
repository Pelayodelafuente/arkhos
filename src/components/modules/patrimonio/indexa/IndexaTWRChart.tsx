"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui";

interface TWRDataPoint {
  label: string;
  twr: number;
  benchmark: number | null;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const twr = payload.find((p) => p.name === "twr")?.value ?? 0;
  const benchEntry = payload.find((p) => p.name === "benchmark");

  return (
    <div
      className="rounded-lg px-3 py-2 text-xs font-mono space-y-1"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        color: "var(--text-primary)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      }}
    >
      <p className="font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p style={{ color: twr >= 0 ? "var(--platform-tr, #2E7D6B)" : "#A32D2D" }}>
        TWR cartera: {twr >= 0 ? "+" : ""}
        {twr.toFixed(2)}%
      </p>
      {benchEntry && benchEntry.value != null && (
        <p style={{ color: "#888780" }}>
          Benchmark: {benchEntry.value >= 0 ? "+" : ""}
          {benchEntry.value.toFixed(2)}%
        </p>
      )}
    </div>
  );
}

interface IndexaTWRChartProps {
  data: TWRDataPoint[];
  isLoading: boolean;
}

export function IndexaTWRChart({ data, isLoading }: IndexaTWRChartProps) {
  const hasBenchmark = data.some((d) => d.benchmark != null);

  if (isLoading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  if (data.length < 3) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          TWR acumulada
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Acumulando datos...
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          TWR acumulada
        </p>
        {hasBenchmark && (
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: "#3B78B0" }} />
              TWR cartera
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4" style={{ borderTop: "2px dashed #888780" }} />
              Benchmark
            </span>
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(160,120,80,0.12)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}
            tickLine={false}
            axisLine={false}
            style={{ fill: "var(--text-muted)" }}
          />
          <YAxis
            tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}
            tickLine={false}
            axisLine={false}
            style={{ fill: "var(--text-muted)" }}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="rgba(160,120,80,0.4)" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="twr"
            stroke="#3B78B0"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#3B78B0", strokeWidth: 0 }}
            name="twr"
          />
          {hasBenchmark && (
            <Line
              type="monotone"
              dataKey="benchmark"
              stroke="#888780"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              connectNulls
              name="benchmark"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
