"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Landmark, Banknote, BarChart2, TrendingUp, TrendingDown } from "lucide-react";
import { PlatformLayout } from "@/components/modules/patrimonio/shared/PlatformLayout";
import { TRDashboard } from "@/components/modules/patrimonio/trade-republic/TRDashboard";
import { PLBadge } from "@/components/modules/patrimonio/shared/PLBadge";
import { Skeleton } from "@/components/ui";
import { usePatrimonioStore } from "@/stores/patrimonio-store";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const formatPct = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

interface TRKPICardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: React.ReactNode;
  accentColor?: string;
}

function TRKPICard({ label, value, icon, sub, accentColor }: TRKPICardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.18 }}
      className="relative overflow-hidden rounded-xl p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            backgroundColor: accentColor ? `color-mix(in srgb, ${accentColor} 12%, transparent)` : "var(--bg-sand)",
            color: accentColor ?? "var(--text-secondary)",
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="font-mono text-xl font-semibold text-foreground tabular-nums">{value}</p>
      {sub && <div className="mt-1.5">{sub}</div>}
    </motion.div>
  );
}

function TRSectionKPIs() {
  const assets = usePatrimonioStore((s) => s.assets);
  const platforms = usePatrimonioStore((s) => s.platforms);

  const isLoading = platforms.length === 0;

  const { cashValue, portfolioValue, portfolioInvested, portfolioPL, portfolioPLPct } =
    useMemo(() => {
      const trPlatform = platforms.find((p) => p.slug === "trade-republic");
      if (!trPlatform) {
        return { cashValue: 0, portfolioValue: 0, portfolioInvested: 0, portfolioPL: 0, portfolioPLPct: 0 };
      }

      const trAssets = assets.filter((a) => a.platform_id === trPlatform.id);
      const cashAssets = trAssets.filter((a) => a.category === "cash");
      const valAssets = trAssets.filter((a) => a.category !== "cash");

      const cash = cashAssets.reduce((s, a) => s + (a.current_value ?? 0), 0);
      const pValue = valAssets.reduce((s, a) => s + (a.current_value ?? 0), 0);
      const pInvested = valAssets.reduce((s, a) => s + a.total_invested, 0);
      const pPL = pValue - pInvested;
      const pPLPct = pInvested > 0 ? (pPL / pInvested) * 100 : 0;

      return {
        cashValue: cash,
        portfolioValue: pValue,
        portfolioInvested: pInvested,
        portfolioPL: pPL,
        portfolioPLPct: pPLPct,
      };
    }, [assets, platforms]);

  const plColor = portfolioPL >= 0 ? "var(--platform-tr)" : "#A32D2D";

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-stone)" }}>
            <Skeleton className="h-3 w-20 rounded mb-3" />
            <Skeleton className="h-7 w-28 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <TRKPICard
        label="Efectivo"
        value={formatEur(cashValue)}
        icon={<Banknote size={14} strokeWidth={1.75} />}
        accentColor="var(--platform-tr)"
      />
      <TRKPICard
        label="Cartera (sin efect.)"
        value={formatEur(portfolioValue)}
        icon={<BarChart2 size={14} strokeWidth={1.75} />}
        accentColor="#3B78B0"
        sub={
          <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
            Inv: {formatEur(portfolioInvested)}
          </span>
        }
      />
      <TRKPICard
        label="P&L €"
        value={`${portfolioPL >= 0 ? "+" : ""}${formatEur(portfolioPL)}`}
        icon={portfolioPL >= 0 ? <TrendingUp size={14} strokeWidth={1.75} /> : <TrendingDown size={14} strokeWidth={1.75} />}
        accentColor={plColor}
      />
      <TRKPICard
        label="Rentabilidad %"
        value={formatPct(portfolioPLPct)}
        icon={<BarChart2 size={14} strokeWidth={1.75} />}
        accentColor={plColor}
        sub={
          <PLBadge amount={portfolioPL} percentage={portfolioPLPct} showAmount showPercentage size="sm" />
        }
      />
    </div>
  );
}

export function TRSection() {
  return (
    <PlatformLayout
      slug="trade-republic"
      color="var(--platform-tr)"
      name="Trade Republic"
      icon={<Landmark size={18} strokeWidth={1.5} aria-hidden="true" />}
    >
      <div className="mt-5 space-y-5">
        <TRSectionKPIs />
        <TRDashboard />
      </div>
    </PlatformLayout>
  );
}
