"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { Skeleton, Tooltip } from "@/components/ui";
import type { IndexaOverview } from "@/types/indexa";

import { formatEur, formatPct } from "@/lib/utils/format";

interface KPICardProps {
  label: string;
  value: React.ReactNode;
  tooltip?: string;
  accent?: "positive" | "negative" | "neutral";
}

function KPICard({ label, value, tooltip, accent = "neutral" }: KPICardProps) {
  const accentColor =
    accent === "positive"
      ? "var(--platform-tr, #2E7D6B)"
      : accent === "negative"
      ? "#A32D2D"
      : "var(--text-primary)";

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
        {tooltip && (
          <Tooltip content={tooltip}>
            <Info
              size={12}
              strokeWidth={1.75}
              className="flex-shrink-0 cursor-help"
              style={{ color: "var(--text-muted)" }}
              aria-label={`Información sobre ${label}`}
            />
          </Tooltip>
        )}
      </div>
      <div className="font-mono text-xl font-semibold tabular-nums leading-tight" style={{ color: accentColor }}>
        {value}
      </div>
    </div>
  );
}

interface IndexaKPIsProps {
  overview: IndexaOverview | null;
  isLoading: boolean;
}

export function IndexaKPIs({ overview, isLoading }: IndexaKPIsProps) {
  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const gainAccent =
    overview.total_gain > 0 ? "positive" : overview.total_gain < 0 ? "negative" : "neutral";
  const twrAccent =
    overview.twr_pct === null ? "neutral" : overview.twr_pct >= 0 ? "positive" : "negative";

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-4 gap-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <KPICard
        label="Valor total"
        value={formatEur(overview.total_value)}
      />
      <KPICard
        label="Ganancia total"
        accent={gainAccent}
        value={
          <span>
            {formatEur(overview.total_gain)}{" "}
            <span className="text-sm opacity-75">
              ({formatPct(overview.total_gain_pct, true)})
            </span>
          </span>
        }
      />
      <KPICard
        label="Rentabilidad TWR"
        accent={twrAccent}
        tooltip="Rentabilidad ponderada por tiempo — elimina el efecto de las aportaciones"
        value={overview.twr_pct === null ? "—" : formatPct(overview.twr_pct, true)}
      />
      <KPICard
        label="Volatilidad"
        accent="neutral"
        tooltip="Desviación estándar mensual × √12"
        value={overview.volatility_pct !== null ? `${overview.volatility_pct.toFixed(2)}%` : "—"}
      />
    </motion.div>
  );
}
