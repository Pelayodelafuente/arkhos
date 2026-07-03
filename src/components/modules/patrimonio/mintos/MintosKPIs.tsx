"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui";
import { formatCurrency, formatEur, formatPct } from "@/lib/utils/format";
import { KPICard } from "@/components/viz";
import type { MintosKPIs } from "@/types/mintos";

const MINTOS_COLOR = "var(--platform-mintos)";

function fmt(v: number) {
  return formatCurrency(v, "EUR");
}

interface StatPillProps {
  label: string;
  value: string;
}

function StatPill({ label, value }: StatPillProps) {
  return (
    <div
      className="flex items-center justify-between rounded-lg px-3 py-2"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="font-mono text-sm font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

interface MintosKPIsProps {
  kpis: MintosKPIs | null;
  isLoading?: boolean;
}

export function MintosKPIs({ kpis, isLoading }: MintosKPIsProps) {
  if (isLoading || !kpis) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const gainColor =
    kpis.net_gain >= 0 ? "var(--color-success, #3B7A57)" : "var(--color-error, var(--color-loss))";
  const xirrValue = kpis.xirr ?? null;

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Main 4 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Valor total"
          value={formatEur(kpis.total_value)}
          numericValue={kpis.total_value}
          format={formatEur}
          valueColor={MINTOS_COLOR}
          description="Valor total de la cartera Mintos"
        />
        <KPICard
          label="Ganancia neta"
          value={`${kpis.net_gain >= 0 ? "+" : ""}${formatEur(kpis.net_gain)}`}
          numericValue={kpis.net_gain}
          format={(n) => `${n >= 0 ? "+" : ""}${formatEur(n)}`}
          valueColor={gainColor}
          delta={formatPct(kpis.net_gain_pct, true)}
          deltaColor={gainColor}
          description="Ganancia neta sobre el capital depositado"
        />
        <KPICard
          label="XIRR anual"
          value={xirrValue !== null ? formatPct(xirrValue, false) : "—"}
          numericValue={xirrValue}
          format={(n) => formatPct(n, false)}
          valueColor={MINTOS_COLOR}
          description="XIRR anual · rentabilidad real ponderada en el tiempo"
        />
        <KPICard
          label="Interés medio"
          value={kpis.avg_interest_rate !== null ? formatPct(kpis.avg_interest_rate, false) : "—"}
          numericValue={kpis.avg_interest_rate}
          format={(n) => formatPct(n, false)}
          description="Interés medio ponderado de la cartera"
        />
      </div>

      {/* 3 stat pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <StatPill label="Total depositado" value={fmt(kpis.total_deposited)} />
        <StatPill label="Intereses este mes" value={fmt(kpis.current_month_interest)} />
        <StatPill label="Intereses mes anterior" value={fmt(kpis.prev_month_interest)} />
      </div>
    </motion.div>
  );
}
