"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui";
import type { CryptoOverview } from "@/types/crypto";

const CRYPTO_COLOR = "var(--platform-crypto)";

const formatEur = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const formatPct = (v: number) =>
  `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

interface KPICardProps {
  label: string;
  value: React.ReactNode;
  accent?: string;
}

function KPICard({ label, value, accent }: KPICardProps) {
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
    </div>
  );
}

interface CryptoKPIsProps {
  overview: CryptoOverview | null;
  isLoading: boolean;
}

export function CryptoKPIs({ overview, isLoading }: CryptoKPIsProps) {
  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const plColor =
    overview.pl_eur >= 0 ? "var(--platform-patrimonio, #2E7D6B)" : "#A32D2D";

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-5 gap-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <KPICard
        label="Valor total"
        value={formatEur(overview.total_value_eur)}
        accent={CRYPTO_COLOR}
      />
      <KPICard
        label="Total invertido"
        value={formatEur(overview.total_invested_eur)}
      />
      <KPICard
        label="P&L total"
        value={
          <span>
            {overview.pl_eur >= 0 ? "+" : ""}
            {formatEur(overview.pl_eur)}{" "}
            <span className="text-sm opacity-75">
              ({formatPct(overview.pl_pct)})
            </span>
          </span>
        }
        accent={plColor}
      />
      <KPICard
        label="Intereses Aave"
        value={
          <span>
            {formatEur(overview.aave_yield_eur)}{" "}
            <span className="text-xs opacity-60">USDC</span>
          </span>
        }
        accent="var(--platform-patrimonio, #2E7D6B)"
      />
      <KPICard
        label="Aportación mensual"
        value={
          <span>
            {formatEur(overview.monthly_plan_eur)}
            <span className="text-sm font-normal opacity-60">/mes</span>
          </span>
        }
        accent={CRYPTO_COLOR}
      />
    </motion.div>
  );
}
