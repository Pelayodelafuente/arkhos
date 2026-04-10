"use client";

import { useMemo } from "react";
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
  const passiveIncome = usePatrimonioStore((s) => s.passiveIncome);

  const passiveIncomeTotal = useMemo(
    () => passiveIncome.reduce((sum, item) => sum + item.amount, 0),
    [passiveIncome]
  );

  if (!overview) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    );
  }

  const capitalInvertido = overview.total_invested - overview.total_cash;
  const plPositive = overview.pl_amount >= 0;
  const plColor = overview.pl_amount === 0
    ? "#B07A3A"
    : plPositive
      ? "#2E7D6B"
      : "#A32D2D";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        label="Total patrimonio"
        value={formatEur(overview.total_value)}
        icon={<Wallet size={14} strokeWidth={1.75} />}
        accentColor="#2E7D6B"
        badge={
          <span className="text-xs text-text-tertiary">
            {overview.platforms.length} plataformas · efectivo: {formatEur(overview.total_cash)}
          </span>
        }
      />

      <KPICard
        label="Capital invertido"
        value={formatEur(capitalInvertido)}
        icon={<PiggyBank size={14} strokeWidth={1.75} />}
        badge={
          <span className="text-xs text-text-tertiary">
            Sin contar efectivo en cuenta
          </span>
        }
      />

      <KPICard
        label="P&L sobre invertido"
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
        label="Ingresos pasivos"
        value={formatEur(passiveIncomeTotal)}
        icon={<DollarSign size={14} strokeWidth={1.75} />}
        accentColor="#4A7A9B"
        badge={
          <span className="text-xs text-text-tertiary">
            Total histórico · todas las plataformas
          </span>
        }
      />
    </div>
  );
}
