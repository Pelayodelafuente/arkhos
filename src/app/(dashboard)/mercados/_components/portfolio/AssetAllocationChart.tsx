"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AssetClassAllocation } from "@/lib/mercados/portfolio-market";

interface Props {
  data: AssetClassAllocation[];
  isLoading: boolean;
}

const CLASS_COLORS: Record<string, string> = {
  etfs_index:    "var(--color-mercados)",
  etfs_thematic: "#60A5FA",
  stocks_us:     "#34D399",
  bonds:         "#FBBF24",
  commodities:   "#F59E0B",
  stocks_eu:     "#F87171",
  stocks_asia:   "#FB923C",
  funds:         "#A78BFA",
  crypto:        "#22D3EE",
  p2p:           "#94A3B8",
  cash:          "#CBD5E1",
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-xl border border-border bg-card animate-pulse ${className}`} />;
}

function DeviationBadge({ deviation }: { deviation: number }) {
  const inRange = Math.abs(deviation) <= 3;
  const sign = deviation > 0 ? "+" : "";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
        inRange
          ? "bg-green-50 text-green-700 border border-green-200"
          : deviation > 0
          ? "bg-red-50 text-red-700 border border-red-200"
          : "bg-amber-50 text-amber-700 border border-amber-200",
      ].join(" ")}
    >
      {sign}
      {deviation.toFixed(1)}%
    </span>
  );
}

export function AssetAllocationChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  const chartData = data.filter(a => a.valueEur > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-4">
        Asignación de activos
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Donut */}
        <div className="flex-shrink-0">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="valueEur"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                strokeWidth={1}
                stroke="var(--color-border)"
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={CLASS_COLORS[entry.id] ?? "var(--color-border)"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: unknown) => [`€${(v as number).toLocaleString("es-ES")}`, ""]}
                contentStyle={{
                  fontSize: 12,
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                }}
                labelFormatter={(label) => String(label)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  Clase
                </th>
                <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  Actual
                </th>
                <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  Objetivo
                </th>
                <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  Desv.
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CLASS_COLORS[item.id] ?? "var(--color-border)" }}
                      />
                      <span className="text-xs text-foreground">{item.label}</span>
                    </div>
                  </td>
                  <td className="py-2 text-right font-mono text-xs tabular-nums text-foreground">
                    {item.currentPct.toFixed(1)}%
                  </td>
                  <td className="py-2 text-right font-mono text-xs tabular-nums text-text-secondary">
                    {item.targetPct.toFixed(0)}%
                  </td>
                  <td className="py-2 text-right">
                    <DeviationBadge deviation={item.deviation} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
