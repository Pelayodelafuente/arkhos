"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, BarChart2, Percent } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { useIndexaStore } from "@/stores/indexa-store";
import { useHorosStore } from "@/stores/horos-store";
import { useCryptoStore } from "@/stores/crypto-store";
import { useMintosStore } from "@/stores/mintos-store";
import { useAnimatedCounter } from "@/lib/hooks/use-animated-counter";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const formatPct = (value: number, signed = false) =>
  `${signed && value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

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
  displayValue: string;
  icon: React.ReactNode;
  accentColor: string;
  sparklineValues?: number[];
  deltaLabel?: string | null;
  deltaColor?: string;
  borderTopColor: string;
  subtitle?: string;
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
  subtitle,
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
        style={{ color: "var(--text-primary, var(--foreground))" }}
      >
        {displayValue}
      </p>

      {deltaLabel && (
        <p className="mt-1.5 font-mono text-xs" style={{ color: deltaColor ?? "var(--text-secondary)" }}>
          {deltaLabel}
        </p>
      )}
      {subtitle && (
        <p className="mt-1 text-[10px] leading-tight" style={{ color: "var(--text-muted, var(--text-tertiary))" }}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// GlobalKPIs — suma todas las plataformas activas
// Arquitectura: añadir nueva plataforma = sumar sus valores aquí
// ---------------------------------------------------------------------------

export function GlobalKPIs() {
  // ── Trade Republic ──────────────────────────────────────────────────────
  const trOverview = usePatrimonioStore((s) => s.overview);
  const getKPISparklines = usePatrimonioStore((s) => s.getKPISparklines);
  const getMonthlyKPIDeltas = usePatrimonioStore((s) => s.getMonthlyKPIDeltas);
  const getCAGR = usePatrimonioStore((s) => s.getCAGR);

  const trSparklines = getKPISparklines();
  const trDeltas = getMonthlyKPIDeltas();
  const trCAGR = getCAGR(); // decimal, e.g. 0.0997

  const trValue = trOverview?.total_value ?? 0;
  const trInvested = trOverview ? trOverview.total_invested - trOverview.total_cash : 0;
  const trPL = trOverview?.pl_amount ?? 0;

  // ── Indexa Capital ───────────────────────────────────────────────────────
  const indexaOverview = useIndexaStore((s) => s.overview);
  const getIndexaValueDelta = useIndexaStore((s) => s.getLastMonthValueDelta);
  const getIndexaContrib = useIndexaStore((s) => s.getLastMonthContribution);

  const indexaValue = indexaOverview?.total_value ?? 0;
  const indexaCost = indexaOverview?.total_cost ?? 0;
  const indexaPL = indexaOverview?.total_gain ?? 0;
  const indexaValueDelta = getIndexaValueDelta();
  const indexaContrib = getIndexaContrib();

  // ── Horos ────────────────────────────────────────────────────────────────
  const horosPosition = useHorosStore((s) => s.position);
  const getHorosLastMonthContribution = useHorosStore((s) => s.getLastMonthContribution);

  const horosValue = horosPosition?.total_value ?? 0;
  const horosCost = horosPosition?.total_cost ?? 0;
  const horosPL = horosPosition?.unrealized_gain ?? 0;
  const horosContrib = getHorosLastMonthContribution();

  // ── Crypto ───────────────────────────────────────────────────────────────
  const cryptoRawAssets = useCryptoStore((s) => s.assets);
  const cryptoRawDefi = useCryptoStore((s) => s.defiPositions);
  const cryptoRawPlan = useCryptoStore((s) => s.monthlyPlan);
  const getCryptoOverview = useCryptoStore((s) => s.getOverview);
  const cryptoOverview = useMemo(() => getCryptoOverview(), [cryptoRawAssets, cryptoRawDefi, cryptoRawPlan, getCryptoOverview]);

  const cryptoValue = cryptoOverview?.total_value_eur ?? 0;
  const cryptoInvested = cryptoOverview?.total_invested_eur ?? 0;
  const cryptoPL = cryptoOverview?.pl_eur ?? null;
  const cryptoMonthlyPlan = cryptoOverview?.monthly_plan_eur ?? 150;

  // ── Mintos ───────────────────────────────────────────────────────────────
  const mintosOverview = useMintosStore((s) => s.overview);
  const mintosDeposits = useMintosStore((s) => s.deposits);
  const getMintosLastMonthContrib = useMintosStore((s) => s.getLastMonthContribution);

  const getMintosValueDelta = useMintosStore((s) => s.getLastMonthValueDelta);
  const mintosValueDelta = getMintosValueDelta();

  const mintosValue = mintosOverview?.total_value ?? 0;
  const mintosInvested = mintosDeposits.reduce((s, d) => s + d.amount, 0);
  const mintosPL = mintosOverview?.net_gain ?? 0;
  const mintosContrib = getMintosLastMonthContrib();
  const mintosXirr = mintosOverview?.xirr ?? null;

  // ── Combinados ───────────────────────────────────────────────────────────
  const totalValue = trValue + indexaValue + horosValue + cryptoValue + mintosValue;
  const totalInvested = trInvested + indexaCost + horosCost + cryptoInvested + mintosInvested;
  const totalPL = trPL + indexaPL + horosPL + (cryptoPL ?? 0) + mintosPL;

  const combinedReturnPct = useMemo(() => {
    if (totalInvested <= 0) return null;

    const trReturnPct = trCAGR !== null ? trCAGR * 100 : null;
    const indexaReturnPct = indexaOverview?.twr_pct ?? null;
    const horosReturnPct = horosPosition?.unrealized_gain_pct ?? null;
    const cryptoReturnPct = (cryptoOverview?.pl_pct !== null && cryptoOverview?.pl_pct !== undefined)
      ? cryptoOverview.pl_pct
      : null;

    const weightedReturns: Array<{ ret: number; weight: number }> = [];
    if (trReturnPct !== null && trInvested > 0) weightedReturns.push({ ret: trReturnPct, weight: trInvested });
    if (indexaReturnPct !== null && indexaCost > 0) weightedReturns.push({ ret: indexaReturnPct, weight: indexaCost });
    if (horosReturnPct !== null && horosCost > 0) weightedReturns.push({ ret: horosReturnPct, weight: horosCost });
    if (cryptoReturnPct !== null && cryptoInvested > 0) weightedReturns.push({ ret: cryptoReturnPct, weight: cryptoInvested });
    if (mintosXirr !== null && mintosInvested > 0) weightedReturns.push({ ret: mintosXirr, weight: mintosInvested });

    if (weightedReturns.length === 0) return null;

    const totalWeight = weightedReturns.reduce((s, w) => s + w.weight, 0);
    if (totalWeight <= 0) return null;

    return weightedReturns.reduce((s, w) => s + w.ret * (w.weight / totalWeight), 0);
  }, [trCAGR, indexaOverview, horosPosition, cryptoOverview, mintosXirr, trInvested, indexaCost, horosCost, cryptoInvested, mintosInvested, totalInvested]);

  // Deltas vs mes anterior
  const deltaTotal = useMemo(() => {
    const trDelta = trDeltas.totalValue ?? 0;
    const indexaDelta = indexaValueDelta ?? 0;
    const mintosDelta = mintosValueDelta ?? 0;
    const combined = trDelta + indexaDelta + mintosDelta;
    if (combined === 0 && trDeltas.totalValue === null && indexaValueDelta === null && mintosValueDelta === null) return null;
    return `${combined >= 0 ? "+" : ""}${formatEur(combined)} vs mes anterior`;
  }, [trDeltas.totalValue, indexaValueDelta, mintosValueDelta]);


  const deltaCapital = useMemo(() => {
    const trDelta = trDeltas.capitalInvertido ?? 0;
    const indexaDelta = indexaContrib ?? 0;
    const horosDelta = horosContrib ?? 0;
    const cryptoDelta = cryptoMonthlyPlan;
    const mintosDelta = mintosContrib ?? 0;
    const combined = trDelta + indexaDelta + horosDelta + cryptoDelta + mintosDelta;
    if (combined === 0 && trDeltas.capitalInvertido === null) return null;
    return `${combined >= 0 ? "+" : ""}${formatEur(combined)} aportado este mes`;
  }, [trDeltas.capitalInvertido, indexaContrib, horosContrib, cryptoMonthlyPlan, mintosContrib]);

  // Animated counters
  const animatedTotal = useAnimatedCounter(totalValue);
  const animatedCapital = useAnimatedCounter(totalInvested);
  const animatedPL = useAnimatedCounter(totalPL);
  const animatedReturn = useAnimatedCounter(combinedReturnPct ?? 0);

  const plColor = totalPL >= 0 ? "var(--platform-tr)" : "#A32D2D";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        label="Total patrimonio"
        displayValue={formatEur(animatedTotal)}
        icon={<Wallet size={14} strokeWidth={1.75} />}
        accentColor="var(--platform-tr)"
        borderTopColor="var(--platform-tr)"
        sparklineValues={trSparklines.totalValue}
        deltaLabel={deltaTotal}
        deltaColor={
          (trDeltas.totalValue ?? 0) + (indexaValueDelta ?? 0) + (mintosValueDelta ?? 0) >= 0
            ? "var(--platform-tr)"
            : "#A32D2D"
        }
      />
      <KPICard
        label="Capital invertido"
        displayValue={formatEur(animatedCapital)}
        icon={<BarChart2 size={14} strokeWidth={1.75} />}
        accentColor="#3B78B0"
        borderTopColor="#3B78B0"
        sparklineValues={trSparklines.capitalInvertido}
        deltaLabel={deltaCapital}
        deltaColor="#3B78B0"
      />
      <KPICard
        label="P&L total"
        displayValue={`${totalPL >= 0 ? "+" : ""}${formatEur(animatedPL)}`}
        icon={totalPL >= 0 ? <TrendingUp size={14} strokeWidth={1.75} /> : <TrendingDown size={14} strokeWidth={1.75} />}
        accentColor={plColor}
        borderTopColor={plColor}
        sparklineValues={trSparklines.plAmount}
      />
      <KPICard
        label="Rentabilidad media ponderada"
        displayValue={combinedReturnPct !== null ? formatPct(animatedReturn, true) : "—"}
        icon={<Percent size={14} strokeWidth={1.75} />}
        accentColor="#7260C4"
        borderTopColor="#7260C4"
        subtitle="TR: CAGR · Indexa: TWR · Horos/Crypto: P&L% · Mintos: XIRR"
      />
    </div>
  );
}
