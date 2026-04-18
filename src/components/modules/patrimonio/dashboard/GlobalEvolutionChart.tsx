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
import { useIndexaStore } from "@/stores/indexa-store";
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

// Extrae clave 'YYYY-MM' de una fecha ISO o 'YYYY-MM-DD'
function toMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7);
}

export function GlobalEvolutionChart() {
  const getEvolutionData = usePatrimonioStore((s) => s.getEvolutionData);
  const getIndexaEvolution = useIndexaStore((s) => s.getEvolutionData);

  const rawTR = getEvolutionData();
  const rawIndexa = getIndexaEvolution();

  // Mapa mes → {value, cost} de Indexa para fusión
  const indexaByMonth = useMemo(() => {
    const map = new Map<string, { value: number; cost: number }>();
    // rawIndexa usa labels tipo "Jun 2025" — necesitamos la key del mes
    // La construimos desde los datos del indexa store directamente
    for (const p of rawIndexa) {
      // label = "Jun 2025" → no es ISO, usamos índice relativo desde jun 2025
      // En su lugar accedemos al mapa por orden; mejor: re-creamos la key desde label
      const [mon, yr] = p.label.split(' ');
      const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      const m = MONTHS_ES.indexOf(mon);
      if (m === -1 || !yr) continue;
      const key = `${yr}-${String(m + 1).padStart(2, '0')}`;
      map.set(key, { value: p.value, cost: p.cost });
    }
    return map;
  }, [rawIndexa]);

  const data = useMemo((): (EvolutionPoint & { label: string })[] => {
    return rawTR.map((p) => {
      const key = toMonthKey(p.date);
      const indexa = indexaByMonth.get(key);
      return {
        ...p,
        value: p.value + (indexa?.value ?? 0),
        invested: p.invested + (indexa?.cost ?? 0),
        label: formatDateShort(p.date),
      };
    });
  }, [rawTR, indexaByMonth]);

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
