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

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const formatEurShort = (value: number) => {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k€`;
  return `${value.toFixed(0)}€`;
};

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// 'YYYY-MM-DD' o 'YYYY-MM' → 'YYYY-MM'
function toMonthKey(s: string): string { return s.substring(0, 7); }

// 'YYYY-MM' → 'MM/YY'
function monthKeyLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${m}/${(y ?? "").slice(-2)}`;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipEntry { value: number; name: string; color: string }
interface CustomTooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string }

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
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
      {payload.map((entry) => (
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

function EmptyState() {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl"
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-stone, rgba(160,120,80,0.25))" }}>
      <p className="text-sm text-muted-foreground">Sin datos de evolución disponibles</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GlobalEvolutionChart — fusión TR + Indexa (preparado para más plataformas)
// ---------------------------------------------------------------------------

export function GlobalEvolutionChart() {
  // ── TR (snapshots mensuales) ─────────────────────────────────────────────
  const trSnapshots = usePatrimonioStore((s) => s.snapshots);

  // ── Indexa — suscripción directa a los datos para forzar re-render ───────
  const indexaTx = useIndexaStore((s) => s.transactions);
  const indexaReturns = useIndexaStore((s) => s.monthlyReturns);

  // ── Construir mapa mensual de TR: 'YYYY-MM' → {value, invested} ──────────
  const trByMonth = useMemo(() => {
    const map = new Map<string, { value: number; invested: number }>();
    for (const s of trSnapshots) {
      const key = toMonthKey(s.snapshot_date);
      map.set(key, {
        value: s.total_value - (s.cash_value ?? 0),
        invested: s.total_invested ?? 0,
      });
    }
    return map;
  }, [trSnapshots]);

  // ── Construir evolución mensual de Indexa desde transacciones + retornos ─
  // Solo subscriptions cuentan como dinero nuevo (transfer_in = rebalanceos)
  const indexaByMonth = useMemo(() => {
    if (!indexaTx.length && !indexaReturns.length) return new Map<string, { value: number; cost: number }>();

    // Mapa de contribuciones mensuales reales (solo subscriptions)
    const contribMap = new Map<string, number>();
    for (const tx of indexaTx) {
      if (tx.type !== "subscription") continue;
      const key = toMonthKey(tx.transaction_date);
      contribMap.set(key, (contribMap.get(key) ?? 0) + tx.amount);
    }

    // Mapa de retornos mensuales
    const returnMap = new Map<string, number>();
    for (const r of indexaReturns) {
      const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
      returnMap.set(key, (r.return_pct ?? 0) / 100);
    }

    // Meses únicos cubiertos por Indexa (contribuciones o retornos)
    const allKeys = [...new Set([...contribMap.keys(), ...returnMap.keys()])].sort();

    const map = new Map<string, { value: number; cost: number }>();
    let value = 0;
    let cumCost = 0;

    for (const key of allKeys) {
      const contrib = contribMap.get(key) ?? 0;
      const ret = returnMap.get(key) ?? 0;
      cumCost += contrib;
      value = (value + contrib) * (1 + ret);
      map.set(key, { value: parseFloat(value.toFixed(2)), cost: parseFloat(cumCost.toFixed(2)) });
    }

    return map;
  }, [indexaTx, indexaReturns]);

  // ── Fusionar: todos los meses de TR + Indexa ────────────────────────────
  // Para meses de Indexa anteriores al primer snapshot TR, el valor de TR = 0
  // Para meses de TR anteriores al inicio de Indexa, el coste de Indexa = 0
  const data = useMemo(() => {
    // Unión de todas las claves de mes de ambas fuentes
    const allKeys = [...new Set([...trByMonth.keys(), ...indexaByMonth.keys()])].sort();

    // Indexa: arrastrar el último valor conocido hacia adelante
    // (cuando hay snapshot TR de un mes posterior al último mes Indexa)
    let lastIndexa = { value: 0, cost: 0 };

    return allKeys.map((key) => {
      const tr = trByMonth.get(key) ?? { value: 0, invested: 0 };
      const indexa = indexaByMonth.get(key);
      if (indexa) lastIndexa = indexa;
      // Solo añadir Indexa si ya ha empezado (cost > 0)
      const idxValue = lastIndexa.cost > 0 ? lastIndexa.value : 0;
      const idxCost = lastIndexa.cost > 0 ? lastIndexa.cost : 0;
      return {
        key,
        label: monthKeyLabel(key),
        value: parseFloat((tr.value + idxValue).toFixed(2)),
        invested: parseFloat((tr.invested + idxCost).toFixed(2)),
      };
    });
  }, [trByMonth, indexaByMonth]);

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
            domain={["auto", "auto"]}
            className="hidden sm:block"
          />

          <Tooltip
            content={(props) => (
              <CustomTooltip
                active={props.active}
                payload={props.payload as unknown as TooltipEntry[] | undefined}
                label={props.label as string | undefined}
              />
            )}
          />

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
