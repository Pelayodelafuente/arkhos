"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, DollarSign, BarChart2 } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { PLBadge } from "@/components/modules/patrimonio/shared/PLBadge";
import { formatEur, formatPct } from "@/lib/utils/format";
import { Sparkline } from "@/components/viz";

// ---------------------------------------------------------------------------
// Delta badge
// ---------------------------------------------------------------------------

function DeltaBadge({ delta, isEur = true }: { delta: number | null; isEur?: boolean }) {
  if (delta === null) return null;
  const color = delta >= 0 ? "#2E7D6B" : "#A32D2D";
  const sign = delta >= 0 ? "+" : "";
  const label = isEur ? formatEur(delta) : `${sign}${delta.toFixed(2)}%`;
  return (
    <span className="text-xs" style={{ color }}>
      {sign}
      {isEur ? formatEur(delta) : label} vs mes ant.
    </span>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KPICardProps {
  label: string;
  value: string;
  badge?: React.ReactNode;
  delta?: React.ReactNode;
  sparkline?: number[];
  icon: React.ReactNode;
  accentColor?: string;
}

function KPICard({ label, value, badge, delta, sparkline, icon, accentColor }: KPICardProps) {
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
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="font-mono text-2xl font-semibold text-foreground leading-none">{value}</p>
        {sparkline && sparkline.length >= 2 && (
          <Sparkline
            values={sparkline}
            color={sparkline[sparkline.length - 1] >= sparkline[0] ? "#2E7D6B" : "#A32D2D"}
            width={56}
            height={22}
            className="flex-shrink-0"
            opacity={0.8}
          />
        )}
      </div>
      {badge && <div className="mt-2">{badge}</div>}
      {delta && <div className="mt-1">{delta}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OverviewKPIs() {
  const overview = usePatrimonioStore((s) => s.overview);
  const passiveIncome = usePatrimonioStore((s) => s.passiveIncome);
  const getCAGR = usePatrimonioStore((s) => s.getCAGR);
  const getMonthlyKPIDeltas = usePatrimonioStore((s) => s.getMonthlyKPIDeltas);
  const getKPISparklines = usePatrimonioStore((s) => s.getKPISparklines);

  const passiveIncomeTotal = useMemo(
    () => passiveIncome.reduce((sum, item) => sum + item.amount, 0),
    [passiveIncome]
  );

  if (!overview) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    );
  }

  const capitalInvertido = overview.total_invested - overview.total_cash;
  const plPositive = overview.pl_amount >= 0;
  const plColor =
    overview.pl_amount === 0 ? "#B07A3A" : plPositive ? "#2E7D6B" : "#A32D2D";

  const cagr = getCAGR();
  const deltas = getMonthlyKPIDeltas();
  const sparklines = getKPISparklines();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* 1. Total patrimonio */}
      <KPICard
        label="Total patrimonio"
        value={formatEur(overview.total_value)}
        icon={<Wallet size={14} strokeWidth={1.75} />}
        accentColor="#2E7D6B"
        sparkline={sparklines.totalValue}
        badge={
          <span className="text-xs text-text-tertiary">
            {overview.platforms.length} plataformas · efectivo {formatEur(overview.total_cash)}
          </span>
        }
        delta={<DeltaBadge delta={deltas.totalValue} />}
      />

      {/* 2. Capital invertido */}
      <KPICard
        label="Capital invertido"
        value={formatEur(capitalInvertido)}
        icon={<PiggyBank size={14} strokeWidth={1.75} />}
        sparkline={sparklines.capitalInvertido}
        badge={
          <span className="text-xs text-text-tertiary">Sin contar efectivo en cuenta</span>
        }
      />

      {/* 3. P&L */}
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
        sparkline={sparklines.plAmount}
        badge={
          <PLBadge amount={overview.pl_amount} percentage={overview.pl_percentage} showPercentage />
        }
      />

      {/* 4. Ingresos pasivos */}
      <KPICard
        label="Ingresos pasivos"
        value={formatEur(passiveIncomeTotal)}
        icon={<DollarSign size={14} strokeWidth={1.75} />}
        accentColor="#4A7A9B"
        badge={
          <span className="text-xs text-text-tertiary">Total histórico · todas las plataformas</span>
        }
      />

      {/* 5. CAGR */}
      <KPICard
        label="Rentabilidad anualizada"
        value={cagr !== null ? formatPct(cagr * 100, true) : "—"}
        icon={<BarChart2 size={14} strokeWidth={1.75} />}
        accentColor="#7260C4"
        badge={
          <span className="text-xs text-text-tertiary">
            TWR anualizado · sin efectivo
          </span>
        }
      />
    </div>
  );
}
