"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";
import type { MintosEvolutionPoint } from "@/types/mintos";

const MINTOS_COLOR = "#C4704A";

function fmt(v: number) {
  return formatCurrency(v, "EUR");
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const total = payload.find((p) => p.name === "total_value")?.value ?? 0;
  const deposited = payload.find((p) => p.name === "total_deposited")?.value ?? 0;
  const gain = total - deposited;

  return (
    <div
      className="rounded-xl px-4 py-3 space-y-1 text-sm"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <p className="font-medium mb-2" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      <div className="flex items-center gap-2 justify-between">
        <span style={{ color: "var(--text-muted)" }}>Valor total</span>
        <span className="font-mono tabular-nums" style={{ color: MINTOS_COLOR }}>
          {fmt(total)}
        </span>
      </div>
      <div className="flex items-center gap-2 justify-between">
        <span style={{ color: "var(--text-muted)" }}>Capital depositado</span>
        <span className="font-mono tabular-nums" style={{ color: "var(--text-secondary)" }}>
          {fmt(deposited)}
        </span>
      </div>
      <div
        className="flex items-center gap-2 justify-between pt-1 border-t"
        style={{ borderColor: "var(--border-stone, rgba(160,120,80,0.2))" }}
      >
        <span style={{ color: "var(--text-muted)" }}>Ganancia</span>
        <span
          className="font-mono tabular-nums font-semibold"
          style={{ color: gain >= 0 ? "#3B7A57" : "#A32D2D" }}
        >
          {gain >= 0 ? "+" : ""}
          {fmt(gain)}
        </span>
      </div>
    </div>
  );
}

interface MintosEvolutionChartProps {
  data: MintosEvolutionPoint[];
}

export function MintosEvolutionChart({ data }: MintosEvolutionChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Sin datos de evolución. Importa tu extracto mensual.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <h3 className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
        Evolución del Portafolio
      </h3>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="mintosValueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={MINTOS_COLOR} stopOpacity={0.18} />
              <stop offset="95%" stopColor={MINTOS_COLOR} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-stone, rgba(160,120,80,0.15))"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--text-muted, #888780)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-muted, #888780)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Capital depositado — dashed line */}
          <Area
            type="monotone"
            dataKey="total_deposited"
            name="total_deposited"
            stroke="#888780"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="none"
            dot={false}
            activeDot={false}
          />
          {/* Valor total — filled area */}
          <Area
            type="monotone"
            dataKey="total_value"
            name="total_value"
            stroke={MINTOS_COLOR}
            strokeWidth={2}
            fill="url(#mintosValueFill)"
            dot={false}
            activeDot={{ r: 4, fill: MINTOS_COLOR, strokeWidth: 0 }}
          />
          <ReferenceLine y={0} stroke="var(--border-stone, rgba(160,120,80,0.2))" strokeWidth={1} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
