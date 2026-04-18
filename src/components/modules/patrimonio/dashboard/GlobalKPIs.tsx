"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, BarChart2, Percent } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const formatPct = (value: number, signed = false) =>
  `${signed && value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

// ---------------------------------------------------------------------------
// Animated counter
// ---------------------------------------------------------------------------

function useAnimatedCounter(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };

    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

// ---------------------------------------------------------------------------
// Mini sparkline
// ---------------------------------------------------------------------------

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 60;
  const H = 24;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} aria-hidden="true" className="flex-shrink-0 opacity-70">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KPICardProps {
  label: string;
  rawValue: number;
  displayValue: string;
  icon: React.ReactNode;
  accentColor: string;
  sparklineValues?: number[];
  deltaLabel?: string | null;
  deltaColor?: string;
  borderTopColor: string;
}

function KPICard({
  label,
  displayValue,
  icon,
  accentColor,
  sparklineValues,
  deltaLabel,
  deltaColor,
  borderTopColor,
}: KPICardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden rounded-xl p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        borderTop: `2px solid ${borderTopColor}`,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
              color: accentColor,
            }}
            aria-hidden="true"
          >
            {icon}
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        {sparklineValues && sparklineValues.length >= 2 && (
          <MiniSparkline values={sparklineValues} color={accentColor} />
        )}
      </div>

      <p
        className="font-mono text-2xl font-semibold tabular-nums"
        style={{ color: accentColor !== "var(--platform-tr)" && accentColor !== "#3B78B0" && accentColor !== "#7260C4" ? accentColor : "var(--text-primary, var(--foreground))" }}
      >
        {displayValue}
      </p>

      {deltaLabel && (
        <p className="mt-1.5 font-mono text-xs" style={{ color: deltaColor ?? "var(--text-secondary)" }}>
          {deltaLabel}
        </p>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// GlobalKPIs
// ---------------------------------------------------------------------------

export function GlobalKPIs() {
  const overview = usePatrimonioStore((s) => s.overview);
  const sparklines = usePatrimonioStore((s) => s.getKPISparklines());
  const deltas = usePatrimonioStore((s) => s.getMonthlyKPIDeltas());
  const cagrRaw = usePatrimonioStore((s) => s.getCAGR());

  const totalValue = overview?.total_value ?? 0;
  const capitalInvertido = overview ? overview.total_invested - overview.total_cash : 0;
  const plAmount = overview?.pl_amount ?? 0;
  const cagrPct = cagrRaw !== null ? cagrRaw * 100 : null;

  const animatedTotal = useAnimatedCounter(totalValue);
  const animatedCapital = useAnimatedCounter(capitalInvertido);
  const animatedPL = useAnimatedCounter(plAmount);
  const animatedCAGR = useAnimatedCounter(cagrPct ?? 0);

  const plColor = plAmount >= 0 ? "var(--platform-tr)" : "#A32D2D";

  const deltaTotal = useMemo(() => {
    if (deltas.totalValue === null) return null;
    const sign = deltas.totalValue >= 0 ? "+" : "";
    return `${sign}${formatEur(deltas.totalValue)} vs mes anterior`;
  }, [deltas.totalValue]);

  const deltaCapital = useMemo(() => {
    if (deltas.capitalInvertido === null) return null;
    const sign = deltas.capitalInvertido >= 0 ? "+" : "";
    return `${sign}${formatEur(deltas.capitalInvertido)} aportado este mes`;
  }, [deltas.capitalInvertido]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        label="Total patrimonio"
        rawValue={totalValue}
        displayValue={formatEur(animatedTotal)}
        icon={<Wallet size={14} strokeWidth={1.75} />}
        accentColor="var(--platform-tr)"
        borderTopColor="var(--platform-tr)"
        sparklineValues={sparklines.totalValue}
        deltaLabel={deltaTotal}
        deltaColor={deltas.totalValue !== null && deltas.totalValue >= 0 ? "var(--platform-tr)" : "#A32D2D"}
      />
      <KPICard
        label="Capital invertido"
        rawValue={capitalInvertido}
        displayValue={formatEur(animatedCapital)}
        icon={<BarChart2 size={14} strokeWidth={1.75} />}
        accentColor="#3B78B0"
        borderTopColor="#3B78B0"
        sparklineValues={sparklines.capitalInvertido}
        deltaLabel={deltaCapital}
        deltaColor="#3B78B0"
      />
      <KPICard
        label="P&L total"
        rawValue={plAmount}
        displayValue={`${plAmount >= 0 ? "+" : ""}${formatEur(animatedPL)}`}
        icon={plAmount >= 0 ? <TrendingUp size={14} strokeWidth={1.75} /> : <TrendingDown size={14} strokeWidth={1.75} />}
        accentColor={plColor}
        borderTopColor={plColor}
        sparklineValues={sparklines.plAmount}
      />
      <KPICard
        label="Rentabilidad anualizada"
        rawValue={cagrPct ?? 0}
        displayValue={cagrPct !== null ? formatPct(animatedCAGR, true) : "—"}
        icon={<Percent size={14} strokeWidth={1.75} />}
        accentColor="#7260C4"
        borderTopColor="#7260C4"
      />
    </div>
  );
}
