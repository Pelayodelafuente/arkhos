"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import type { PLBarItem } from "@/types/patrimonio";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const formatPct = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

interface TooltipPayloadItem {
  payload: PLBarItem;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div
      className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs"
      style={{ boxShadow: "var(--shadow-modal)" }}
    >
      <p className="font-medium text-foreground">{item.name}</p>
      <p className="mt-0.5 font-mono text-text-tertiary">{item.ticker}</p>
      <div className="mt-2 space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-text-secondary">P&L</span>
          <span
            className="font-mono font-medium"
            style={{ color: item.pl_amount >= 0 ? "var(--module-patrimonio)" : "#A32D2D" }}
          >
            {formatEur(item.pl_amount)}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-text-secondary">Rentabilidad</span>
          <span
            className="font-mono font-medium"
            style={{ color: item.pl_percentage >= 0 ? "var(--module-patrimonio)" : "#A32D2D" }}
          >
            {formatPct(item.pl_percentage)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TRPLBarChart() {
  const rawData = usePatrimonioStore((s) => s.getPLBarData());

  // Top 8 gainers + top 8 losers = max 16
  const gainers = rawData.filter((d) => d.pl_amount > 0).slice(0, 8);
  const losers = rawData.filter((d) => d.pl_amount < 0).slice(-8);
  const data = [...gainers, ...losers].sort((a, b) => b.pl_percentage - a.pl_percentage);

  if (data.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center">
        <p className="text-sm text-text-tertiary">Sin datos de P&L</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatEur(v)}
          tick={{ fontSize: 10, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="ticker"
          width={52}
          tick={{ fontSize: 10, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <ReferenceLine x={0} stroke="var(--border)" strokeWidth={2} />
        <Bar dataKey="pl_amount" radius={[0, 3, 3, 0]} maxBarSize={18}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.pl_amount >= 0 ? "#2E7D6B" : "#A32D2D"}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
