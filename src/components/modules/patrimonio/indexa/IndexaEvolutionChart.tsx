"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui";

const formatEur = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const formatYAxis = (v: number) => {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k€`;
  return `${v}€`;
};

interface EvolutionDataPoint {
  label: string;
  value: number;
  cost: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload.find((p) => p.name === "value")?.value ?? 0;
  const cost = payload.find((p) => p.name === "cost")?.value ?? 0;
  const gain = value - cost;

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
      <p>
        <span style={{ color: "var(--text-muted)" }}>Valor: </span>
        <span>{formatEur(value)}</span>
      </p>
      <p>
        <span style={{ color: "var(--text-muted)" }}>Aportado: </span>
        <span>{formatEur(cost)}</span>
      </p>
      <p style={{ color: gain >= 0 ? "var(--platform-tr, #2E7D6B)" : "#A32D2D" }}>
        <span>Ganancia: </span>
        <span>
          {gain >= 0 ? "+" : ""}
          {formatEur(gain)}
        </span>
      </p>
    </div>
  );
}

interface IndexaEvolutionChartProps {
  data: EvolutionDataPoint[];
  isLoading: boolean;
}

export function IndexaEvolutionChart({ data, isLoading }: IndexaEvolutionChartProps) {
  if (isLoading) {
    return <Skeleton className="h-72 rounded-xl" />;
  }

  if (data.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center text-sm"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          color: "var(--text-muted)",
        }}
      >
        Sin datos suficientes para mostrar evolución
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
      <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        Evolución del patrimonio
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B78B0" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3B78B0" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}
            tickLine={false}
            axisLine={false}
            style={{ fill: "var(--text-muted)" }}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="line"
            iconSize={12}
            formatter={(value) =>
              value === "value" ? "Valor" : "Aportado"
            }
            wrapperStyle={{ fontSize: 11 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3B78B0"
            strokeWidth={2}
            fill="url(#gradValue)"
            dot={false}
            name="value"
          />
          <Area
            type="monotone"
            dataKey="cost"
            stroke="rgba(160,120,80,0.5)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="none"
            dot={false}
            name="cost"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
