"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { Skeleton, Tooltip } from "@/components/ui";
import type { IndexaOverview } from "@/types/indexa";

interface MetricItemProps {
  label: string;
  value: string;
  description: string;
  tooltip?: string;
  accent?: "positive" | "negative" | "neutral";
  index: number;
}

function MetricItem({ label, value, description, tooltip, accent = "neutral", index }: MetricItemProps) {
  const accentColor =
    accent === "positive"
      ? "var(--platform-tr, #2E7D6B)"
      : accent === "negative"
      ? "#A32D2D"
      : "var(--text-primary)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
        {tooltip && (
          <Tooltip content={tooltip}>
            <Info
              size={11}
              strokeWidth={1.75}
              className="flex-shrink-0 cursor-help"
              style={{ color: "var(--text-muted)" }}
              aria-label={`Información sobre ${label}`}
            />
          </Tooltip>
        )}
      </div>
      <p className="font-mono text-xl font-semibold tabular-nums mb-1" style={{ color: accentColor }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {description}
      </p>
    </motion.div>
  );
}

function fmt(v: number | null, dec = 2, suffix = "%") {
  if (v === null) return "—";
  return `${v.toFixed(dec)}${suffix}`;
}

interface IndexaRiskMetricsProps {
  overview: IndexaOverview | null;
  isLoading: boolean;
}

export function IndexaRiskMetrics({ overview, isLoading }: IndexaRiskMetricsProps) {
  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const metrics: Omit<MetricItemProps, "index">[] = [
    {
      label: "Volatilidad anualizada",
      value: fmt(overview.volatility_pct),
      description: "Desviación estándar × √12",
      accent: "neutral",
    },
    {
      label: "Max Drawdown",
      value: fmt(overview.max_drawdown_pct),
      description: "Caída máxima desde el pico",
      accent: overview.max_drawdown_pct !== null && overview.max_drawdown_pct < 0 ? "negative" : "neutral",
    },
    {
      label: "Ratio Sharpe",
      value: fmt(overview.sharpe_ratio, 2, ""),
      description: "Rentabilidad/riesgo ajustado",
      accent:
        overview.sharpe_ratio !== null
          ? overview.sharpe_ratio >= 1
            ? "positive"
            : overview.sharpe_ratio < 0
            ? "negative"
            : "neutral"
          : "neutral",
    },
    {
      label: "Mejor mes",
      value: fmt(overview.best_month_pct),
      description: "Mayor rentabilidad mensual",
      accent: "positive",
    },
    {
      label: "Peor mes",
      value: fmt(overview.worst_month_pct),
      description: "Menor rentabilidad mensual",
      accent: "negative",
    },
    {
      label: "MWR",
      value: fmt(overview.mwr_pct),
      description: "Rent. ponderada por dinero",
      tooltip: "Money Weighted Return — refleja el impacto temporal de las aportaciones",
      accent:
        overview.mwr_pct !== null
          ? overview.mwr_pct >= 0
            ? "positive"
            : "negative"
          : "neutral",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {metrics.map((m, i) => (
        <MetricItem key={m.label} {...m} index={i} />
      ))}
    </div>
  );
}
