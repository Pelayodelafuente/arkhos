"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { IndicesData } from "@/lib/mercados/assets";
import { ChartWrapper } from "../ChartWrapper";

interface Props {
  data: IndicesData;
  isLoading: boolean;
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card animate-pulse ${className}`} />
  );
}

const INDEX_COLORS: Record<string, string> = {
  sp500: "var(--color-mercados)",
  nasdaq: "var(--color-terracota)",
  msciWorld: "var(--color-success)",
  dax: "var(--color-warning)",
  eurostoxx: "#4A7A9B",
  emerging: "#9B7A4A",
};

function PctBadge({ pct }: { pct: number }) {
  const pos = pct >= 0;
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        pos
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-red-50 text-red-700 border border-red-200",
      ].join(" ")}
    >
      {pos ? "+" : ""}
      {pct.toFixed(2)}%
    </span>
  );
}

export function IndicesSection({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  const { indices, normalizedHistory } = data;
  const activeIndices = indices.filter((idx) => idx.price > 0);

  return (
    <div className="space-y-4">
      {/* Tabla de índices */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <p className="text-sm font-medium text-text-secondary">Índices Globales</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-sand">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  Índice
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  Precio
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  1D
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  1M
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  1Y
                </th>
              </tr>
            </thead>
            <tbody>
              {indices.map((idx, i) => (
                <tr
                  key={idx.id}
                  className={[
                    "border-b border-border last:border-0 transition-colors",
                    i % 2 === 0 ? "" : "bg-sand/40",
                  ].join(" ")}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: INDEX_COLORS[idx.id] ?? "var(--color-border)" }}
                        aria-hidden="true"
                      />
                      <span className="font-medium text-foreground">{idx.label}</span>
                      <span className="text-xs text-text-tertiary font-mono">{idx.ticker}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-foreground tabular-nums">
                    {idx.price > 0 ? idx.price.toLocaleString("en-US") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {idx.price > 0 ? <PctBadge pct={idx.changePct1d} /> : <span className="text-text-tertiary">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {idx.price > 0 ? <PctBadge pct={idx.changePct1m} /> : <span className="text-text-tertiary">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {idx.price > 0 ? <PctBadge pct={idx.changePct1y} /> : <span className="text-text-tertiary">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfico normalizado */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <p className="text-sm font-medium text-text-secondary">
          Performance comparado (base 100, 1 año)
        </p>

        <ChartWrapper minHeight={280}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={normalizedHistory}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              strokeOpacity={0.5}
            />
            <XAxis dataKey="date" tick={false} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(v: unknown, name: string | number | undefined) => [
                `${(v as number).toFixed(1)}`,
                activeIndices.find((i) => i.id === String(name ?? ""))?.label ?? String(name ?? ""),
              ]}
              contentStyle={{
                fontSize: 12,
                border: "1px solid var(--color-border)",
                borderRadius: 8,
              }}
              labelFormatter={(label) => String(label)}
            />
            <Legend
              formatter={(value: string) =>
                activeIndices.find((i) => i.id === value)?.label ?? value
              }
              wrapperStyle={{ fontSize: 12 }}
            />
            {activeIndices.map((idx) => (
              <Line
                key={idx.id}
                type="monotone"
                dataKey={idx.id}
                stroke={INDEX_COLORS[idx.id] ?? "var(--color-border)"}
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>
    </div>
  );
}
