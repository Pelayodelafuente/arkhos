"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { BenchmarkComparison } from "@/lib/mercados/portfolio-market";
import { ChartWrapper } from "../ChartWrapper";

interface Props {
  data: BenchmarkComparison | undefined;
  isLoading: boolean;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-xl border border-border bg-card animate-pulse ${className}`} />;
}

const COLORS: Record<string, string> = {
  "Mi Cartera": "#C4704A",
  "S&P 500":    "#3B78B0",
  "MSCI World": "#2E7D6B",
  "NASDAQ":     "#E67E22",
};

export function BenchmarkChart({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return <Skeleton className="h-72" />;
  }

  const chartData = [
    {
      period: "1M",
      "Mi Cartera": data.portfolioReturn1m,
      ...Object.fromEntries(data.benchmarks.map(b => [b.label, b.return1m])),
    },
    {
      period: "3M",
      "Mi Cartera": data.portfolioReturn3m,
      ...Object.fromEntries(data.benchmarks.map(b => [b.label, b.return3m])),
    },
    {
      period: "1Y",
      "Mi Cartera": data.portfolioReturn1y,
      ...Object.fromEntries(data.benchmarks.map(b => [b.label, b.return1y])),
    },
  ];

  const barKeys = ["Mi Cartera", ...data.benchmarks.map(b => b.label)];

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
        Mi Cartera vs Benchmarks
      </p>

      <ChartWrapper minHeight={220}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
          data={chartData}
          margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
          barCategoryGap="25%"
          barGap={2}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
          />
          <Tooltip
            formatter={(v: unknown, name: string | number | undefined) => [
              `${(v as number).toFixed(2)}%`,
              String(name ?? ""),
            ]}
            contentStyle={{
              fontSize: 12,
              border: "1px solid var(--color-border)",
              borderRadius: 8,
            }}
            labelFormatter={(label) => String(label)}
          />
          <ReferenceLine y={0} stroke="var(--color-border)" strokeWidth={1} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {barKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              fill={COLORS[key] ?? "var(--color-border)"}
              radius={[2, 2, 0, 0]}
            />
          ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>

      <p className="text-[11px] text-text-tertiary border-t border-border pt-3 leading-relaxed">
        Los retornos de &ldquo;Mi Cartera&rdquo; son estimaciones basadas en la ponderación por clase de activo.
        Para cifras exactas, consulta el módulo Patrimonio.
      </p>
    </div>
  );
}
