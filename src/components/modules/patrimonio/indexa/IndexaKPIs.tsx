"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui";
import type { IndexaOverview } from "@/types/indexa";
import { formatEur, formatPct } from "@/lib/utils/format";
import { KPICard } from "@/components/viz";

function accentColor(accent: "positive" | "negative" | "neutral"): string | undefined {
  return accent === "positive" ? "#2E7D6B" : accent === "negative" ? "#A32D2D" : undefined;
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
        numericValue={overview.total_value}
        format={formatEur}
        description="Valor total de la cartera Indexa"
      />
      <KPICard
        label="Ganancia total"
        value={formatEur(overview.total_gain)}
        numericValue={overview.total_gain}
        format={formatEur}
        valueColor={accentColor(gainAccent)}
        delta={formatPct(overview.total_gain_pct, true)}
        deltaColor={accentColor(gainAccent)}
        description="Ganancia total sobre el capital aportado"
      />
      <KPICard
        label="Rentabilidad TWR"
        value={overview.twr_pct === null ? "—" : formatPct(overview.twr_pct, true)}
        numericValue={overview.twr_pct}
        format={(n) => formatPct(n, true)}
        valueColor={accentColor(twrAccent)}
        description="Rentabilidad ponderada por tiempo — elimina el efecto de las aportaciones"
      />
      <KPICard
        label="Volatilidad"
        value={overview.volatility_pct !== null ? formatPct(overview.volatility_pct, false, 2) : "—"}
        numericValue={overview.volatility_pct}
        format={(n) => formatPct(n, false, 2)}
        description="Desviación estándar mensual × √12"
      />
    </motion.div>
  );
}
