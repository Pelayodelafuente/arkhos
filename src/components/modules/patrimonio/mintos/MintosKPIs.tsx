"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/format";
import type { MintosKPIs } from "@/types/mintos";

const MINTOS_COLOR = "var(--platform-mintos)";

function fmt(v: number) {
  return formatCurrency(v, "EUR");
}

function fmtPct(v: number, signed = true) {
  return `${signed && v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

interface KPICardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
}

function KPICard({ label, value, sub, accent }: KPICardProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <span
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <div
        className="font-mono text-xl font-semibold tabular-nums leading-tight"
        style={{ color: accent ?? "var(--text-primary)" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
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
    kpis.net_gain >= 0 ? "var(--color-success, #3B7A57)" : "var(--color-error, #A32D2D)";
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
          value={fmt(kpis.total_value)}
          accent={MINTOS_COLOR}
        />
        <KPICard
          label="Ganancia neta"
          value={
            <span>
              {kpis.net_gain >= 0 ? "+" : ""}
              {fmt(kpis.net_gain)}{" "}
              <span className="text-sm opacity-75">({fmtPct(kpis.net_gain_pct)})</span>
            </span>
          }
          accent={gainColor}
        />
        <KPICard
          label="XIRR anual"
          value={xirrValue !== null ? `${fmtPct(xirrValue, false)}` : "—"}
          sub="rentabilidad real"
          accent={MINTOS_COLOR}
        />
        <KPICard
          label="Interés medio"
          value={kpis.avg_interest_rate !== null ? `${kpis.avg_interest_rate.toFixed(2)}%` : "—"}
          sub="ponderado cartera"
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
