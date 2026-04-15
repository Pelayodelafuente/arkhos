"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, DollarSign, BarChart2 } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { PLBadge } from "@/components/modules/patrimonio/shared/PLBadge";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const formatPct = (value: number, signed = false) =>
  `${signed && value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

// ---------------------------------------------------------------------------
// Mini sparkline (inline SVG)
// ---------------------------------------------------------------------------

function MiniSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 56;
  const H = 22;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const isPositive = values[values.length - 1] >= values[0];
  const color = isPositive ? "#2E7D6B" : "#A32D2D";
  return (
    <svg width={W} height={H} aria-hidden="true" className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
    </svg>
  );
}

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
        {sparkline && sparkline.length >= 2 && <MiniSparkline values={sparkline} />}
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
        delta={<DeltaBadge delta={deltas.capitalInvertido} />}
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
        delta={<DeltaBadge delta={deltas.passiveIncomeMonth} />}
      />

      {/* 5. CAGR */}
      <KPICard
        label="Rentabilidad anualizada"
        value={cagr !== null ? formatPct(cagr * 100, true) : "—"}
        icon={<BarChart2 size={14} strokeWidth={1.75} />}
        accentColor="#7260C4"
        badge={
          <span className="text-xs text-text-tertiary">
            CAGR desde inicio · sin efectivo
          </span>
        }
      />
    </div>
  );
}
