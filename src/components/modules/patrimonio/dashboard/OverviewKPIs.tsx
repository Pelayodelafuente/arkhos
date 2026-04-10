"use client";

import { TrendingUp, TrendingDown, Wallet, PiggyBank, DollarSign } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { PLBadge } from "@/components/modules/patrimonio/shared/PLBadge";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

interface KPICardProps {
  label: string;
  value: string;
  badge?: React.ReactNode;
  icon: React.ReactNode;
  accentColor?: string;
}

function KPICard({ label, value, badge, icon, accentColor }: KPICardProps) {
  return (
    <div
      className="rounded-xl border border-border bg-card p-5"
      style={{ borderTopColor: accentColor, borderTopWidth: accentColor ? 2 : 1 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-tertiary">{label}</span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            backgroundColor: accentColor ? `${accentColor}18` : "var(--bg-sand)",
            color: accentColor ?? "var(--text-tertiary)",
          }}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold text-foreground">{value}</p>
      {badge && <div className="mt-2">{badge}</div>}
    </div>
  );
}

export function OverviewKPIs() {
  const overview = usePatrimonioStore((s) => s.overview);
  const passiveIncomeYTD = usePatrimonioStore((s) => s.getPassiveIncomeYTD());

  if (!overview) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    );
  }

  const plPositive = overview.pl_amount >= 0;
  const plColor = overview.pl_amount === 0
    ? "#B07A3A"
    : plPositive
      ? "var(--module-patrimonio)"
      : "#A32D2D";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <KPICard
        label="Total patrimonio"
        value={formatEur(overview.total_value)}
        icon={<Wallet size={14} strokeWidth={1.75} />}
        accentColor="var(--module-patrimonio)"
        badge={
          <span className="text-xs text-text-tertiary">
            {overview.platforms.length} plataformas
          </span>
        }
      />

      <KPICard
        label="Total invertido"
        value={formatEur(overview.total_invested)}
        icon={<PiggyBank size={14} strokeWidth={1.75} />}
        badge={
          <span className="text-xs text-text-tertiary">
            Efectivo: {formatEur(overview.total_cash)}
          </span>
        }
      />

      <KPICard
        label="P&L en euros"
        value={formatEur(overview.pl_amount)}
        icon={
          plPositive ? (
            <TrendingUp size={14} strokeWidth={1.75} />
          ) : (
            <TrendingDown size={14} strokeWidth={1.75} />
          )
        }
        accentColor={plColor}
        badge={
          <PLBadge
            amount={overview.pl_amount}
            percentage={overview.pl_percentage}
            showPercentage
          />
        }
      />

      <KPICard
        label="P&L en %"
        value={`${overview.pl_percentage >= 0 ? "+" : ""}${overview.pl_percentage.toFixed(2)}%`}
        icon={
          plPositive ? (
            <TrendingUp size={14} strokeWidth={1.75} />
          ) : (
            <TrendingDown size={14} strokeWidth={1.75} />
          )
        }
        accentColor={plColor}
        badge={
          <span className="text-xs text-text-tertiary">
            Rentabilidad global
          </span>
        }
      />

      <KPICard
        label="Ingresos pasivos YTD"
        value={formatEur(passiveIncomeYTD)}
        icon={<DollarSign size={14} strokeWidth={1.75} />}
        accentColor="#3B78B0"
        badge={
          <span className="text-xs text-text-tertiary">
            {new Date().getFullYear()}
          </span>
        }
      />
    </div>
  );
}
