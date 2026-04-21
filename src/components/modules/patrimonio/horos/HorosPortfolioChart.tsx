"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { HorosPortfolioPoint } from "@/types/horos";

const HOROS_COLOR = "#7260C4";
const GRANATE = "#8B1A2E";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 text-xs"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        minWidth: 180,
      }}
    >
      <p className="font-medium mb-1.5 text-foreground">{label}</p>
      <div className="space-y-1 font-mono">
        {payload.map((p) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: "var(--text-muted)" }}>
              {p.name === "portfolio_value" ? "Valor cartera" : "Aportado"}
            </span>
            <span style={{ color: p.color }}>{fmt(p.value)}</span>
          </div>
        ))}
        {payload.length === 2 && payload[0].value != null && payload[1].value != null && (
          <div className="flex justify-between gap-4 pt-1 border-t border-stone-200">
            <span style={{ color: "var(--text-muted)" }}>Ganancia</span>
            <span style={{ color: payload[1].value >= payload[0].value ? "var(--platform-tr, #2E7D6B)" : GRANATE }}>
              {payload[1].value >= payload[0].value ? "+" : ""}
              {fmt(payload[1].value - payload[0].value)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface HorosPortfolioChartProps {
  data: HorosPortfolioPoint[];
}

export function HorosPortfolioChart({ data }: HorosPortfolioChartProps) {
  if (data.length === 0) return null;

  const validData = data.filter((d) => d.portfolio_value != null);

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <div className="mb-3">
        <h3 className="font-heading text-sm text-foreground">Valoración vs Aportaciones</h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Evolución del valor de tu cartera Horos
        </p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={validData} margin={{ top: 8, right: 4, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="horosValueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={HOROS_COLOR} stopOpacity={0.18} />
              <stop offset="95%" stopColor={HOROS_COLOR} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="horosCostGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={GRANATE} stopOpacity={0.12} />
              <stop offset="95%" stopColor={GRANATE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-stone, rgba(160,120,80,0.15))" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--text-muted, #888780)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--text-muted, #888780)" }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
            width={38}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="cumulative_invested"
            stroke={GRANATE}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="url(#horosCostGrad)"
            dot={false}
            name="cumulative_invested"
          />
          <Area
            type="monotone"
            dataKey="portfolio_value"
            stroke={HOROS_COLOR}
            strokeWidth={2}
            fill="url(#horosValueGrad)"
            dot={{ r: 3.5, fill: HOROS_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: HOROS_COLOR }}
            name="portfolio_value"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
