"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import type { EvolutionPoint } from "@/types/patrimonio";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const formatEurShort = (value: number) => {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}k€`;
  }
  return `${value.toFixed(0)}€`;
};

const formatDateShort = (dateStr: string) => {
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
};

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  value: number;
  name: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const typedPayload = payload;

  return (
    <div
      className="rounded-xl p-3"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        minWidth: 160,
      }}
    >
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {typedPayload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="text-xs" style={{ color: entry.color }}>
            {entry.name === "value" ? "Patrimonio" : "Invertido"}
          </span>
          <span className="font-mono text-sm font-semibold" style={{ color: entry.color }}>
            {formatEur(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-stone, rgba(160,120,80,0.25))" }}>
      <p className="text-sm text-muted-foreground">Sin datos de evolución disponibles</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GlobalEvolutionChart
// ---------------------------------------------------------------------------

export function GlobalEvolutionChart() {
  const getEvolutionData = usePatrimonioStore((s) => s.getEvolutionData);

  const rawData = getEvolutionData();

  const data = useMemo((): (EvolutionPoint & { label: string })[] => {
    return rawData.map((p) => ({
      ...p,
      label: formatDateShort(p.date),
    }));
  }, [rawData]);

  if (data.length === 0) return <EmptyState />;

  return (
    <div
      className="overflow-hidden rounded-xl p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <p className="mb-4 text-sm font-medium text-foreground">Evolución del patrimonio</p>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2E7D6B" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2E7D6B" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradInvested" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B78B0" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3B78B0" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(160,120,80,0.15)" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)", fill: "var(--muted-foreground, #888780)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            tickFormatter={formatEurShort}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)", fill: "var(--muted-foreground, #888780)" }}
            axisLine={false}
            tickLine={false}
            width={54}
            className="hidden sm:block"
          />

          <Tooltip content={(props) => <CustomTooltip active={props.active} payload={props.payload as unknown as TooltipPayloadEntry[] | undefined} label={props.label as string | undefined} />} />

          <Area
            type="monotone"
            dataKey="invested"
            stroke="#3B78B0"
            strokeWidth={1.5}
            fill="url(#gradInvested)"
            dot={false}
            activeDot={{ r: 3, fill: "#3B78B0" }}
            name="invested"
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke="#2E7D6B"
            strokeWidth={2}
            fill="url(#gradValue)"
            dot={false}
            activeDot={{ r: 4, fill: "#2E7D6B" }}
            name="value"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
