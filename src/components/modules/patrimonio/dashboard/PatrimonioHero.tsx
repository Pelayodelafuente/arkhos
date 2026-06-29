"use client";

import { useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { useIndexaStore } from "@/stores/indexa-store";
import { useHorosStore } from "@/stores/horos-store";
import { useCryptoStore } from "@/stores/crypto-store";
import { useMintosStore } from "@/stores/mintos-store";
import { useAnimatedCounter } from "@/lib/hooks/use-animated-counter";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

import { formatEur, formatPct } from "@/lib/utils/format";
import { Sparkline } from "@/components/viz";

// ---------------------------------------------------------------------------
// SubMetric — tarjeta interna de la fila inferior
// ---------------------------------------------------------------------------

interface SubMetricProps {
  label: string;
  value: string;
  subtext?: string | null;
  color: string;
}

function SubMetric({ label, value, subtext, color }: SubMetricProps) {
  return (
    <div className="px-2.5 py-4 sm:px-5">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="font-mono text-[13px] font-semibold mt-0.5 sm:text-xl" style={{ color }}>{value}</p>
      {subtext && (
        <p className="font-mono text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{subtext}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PatrimonioHero
// ---------------------------------------------------------------------------

export function PatrimonioHero() {
  // ── Trade Republic ──────────────────────────────────────────────────────
  const trOverview = usePatrimonioStore((s) => s.overview);
  const getKPISparklines = usePatrimonioStore((s) => s.getKPISparklines);
  const getMonthlyKPIDeltas = usePatrimonioStore((s) => s.getMonthlyKPIDeltas);
  const getCAGR = usePatrimonioStore((s) => s.getCAGR);
  const pricesLastUpdated = usePatrimonioStore((s) => s.pricesLastUpdated);
  const isLoadingPrices = usePatrimonioStore((s) => s.isLoadingPrices);
  const isLoading = usePatrimonioStore((s) => s.isLoading);
  const privacyMode = usePatrimonioStore((s) => s.privacyMode);
  const togglePrivacyMode = usePatrimonioStore((s) => s.togglePrivacyMode);

  const trSparklines = getKPISparklines();
  const trDeltas = getMonthlyKPIDeltas();
  const trCAGR = getCAGR();

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
  // Las deps extra son triggers: el getter lee get() internamente y debe recomputar al cambiar el store
  const cryptoOverview = useMemo(() => {
    void cryptoRawAssets; void cryptoRawDefi; void cryptoRawPlan
    return getCryptoOverview()
  }, [cryptoRawAssets, cryptoRawDefi, cryptoRawPlan, getCryptoOverview]);

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
    const cryptoReturnPct =
      cryptoOverview?.pl_pct !== null && cryptoOverview?.pl_pct !== undefined
        ? cryptoOverview.pl_pct
        : null;

    const weightedReturns: Array<{ ret: number; weight: number }> = [];
    if (trReturnPct !== null && trInvested > 0)
      weightedReturns.push({ ret: trReturnPct, weight: trInvested });
    if (indexaReturnPct !== null && indexaCost > 0)
      weightedReturns.push({ ret: indexaReturnPct, weight: indexaCost });
    if (horosReturnPct !== null && horosCost > 0)
      weightedReturns.push({ ret: horosReturnPct, weight: horosCost });
    if (cryptoReturnPct !== null && cryptoInvested > 0)
      weightedReturns.push({ ret: cryptoReturnPct, weight: cryptoInvested });
    if (mintosXirr !== null && mintosInvested > 0)
      weightedReturns.push({ ret: mintosXirr, weight: mintosInvested });

    if (weightedReturns.length === 0) return null;
    const totalWeight = weightedReturns.reduce((s, w) => s + w.weight, 0);
    if (totalWeight <= 0) return null;
    return weightedReturns.reduce((s, w) => s + w.ret * (w.weight / totalWeight), 0);
  }, [
    trCAGR,
    indexaOverview,
    horosPosition,
    cryptoOverview,
    mintosXirr,
    trInvested,
    indexaCost,
    horosCost,
    cryptoInvested,
    mintosInvested,
    totalInvested,
  ]);

  // ── Deltas ────────────────────────────────────────────────────────────────
  const deltaTotal = useMemo(() => {
    const trDelta = trDeltas.totalValue ?? 0;
    const indexaDelta = indexaValueDelta ?? 0;
    const mintosDelta = mintosValueDelta ?? 0;
    const combined = trDelta + indexaDelta + mintosDelta;
    if (
      combined === 0 &&
      trDeltas.totalValue === null &&
      indexaValueDelta === null &&
      mintosValueDelta === null
    )
      return null;
    return `${combined >= 0 ? "+" : ""}${formatEur(combined)} este mes`;
  }, [trDeltas.totalValue, indexaValueDelta, mintosValueDelta]);

  const deltaTotalNumeric = useMemo(() => {
    return (trDeltas.totalValue ?? 0) + (indexaValueDelta ?? 0) + (mintosValueDelta ?? 0);
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
  }, [
    trDeltas.capitalInvertido,
    indexaContrib,
    horosContrib,
    cryptoMonthlyPlan,
    mintosContrib,
  ]);

  // ── Timestamp ────────────────────────────────────────────────────────────
  const updatedTime = useMemo(() => {
    if (!pricesLastUpdated) return null;
    return new Date(pricesLastUpdated).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [pricesLastUpdated]);

  // ── Animated counters ─────────────────────────────────────────────────────
  const animatedTotal = useAnimatedCounter(totalValue);
  const animatedPL = useAnimatedCounter(totalPL);
  const animatedReturn = useAnimatedCounter(combinedReturnPct ?? 0);
  const animatedCapital = useAnimatedCounter(totalInvested);

  // ── Colores semánticos ────────────────────────────────────────────────────
  const sparklineValues = trSparklines.totalValue ?? [];

  const deltaColor =
    deltaTotal === null
      ? "var(--text-tertiary)"
      : deltaTotalNumeric >= 0
      ? "var(--color-gain)"
      : "var(--color-loss)";

  const plColor = totalPL >= 0 ? "var(--color-gain)" : "var(--color-loss)";
  const returnColor =
    combinedReturnPct === null
      ? "var(--text-secondary)"
      : combinedReturnPct >= 0
      ? "var(--color-gain)"
      : "var(--color-loss)";

  if (isLoading) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <div className="animate-pulse px-5 pt-5 pb-4">
          <div
            className="h-3 w-28 rounded-md mb-3"
            style={{ backgroundColor: "var(--border-stone)" }}
          />
          <div
            className="h-14 w-48 rounded-md mb-4"
            style={{ backgroundColor: "var(--border-stone)" }}
          />
          <div className="flex gap-6">
            <div
              className="h-8 w-32 rounded-md"
              style={{ backgroundColor: "var(--border-stone)" }}
            />
            <div
              className="h-8 w-32 rounded-md"
              style={{ backgroundColor: "var(--border-stone)" }}
            />
            <div
              className="h-8 w-32 rounded-md"
              style={{ backgroundColor: "var(--border-stone)" }}
            />
          </div>
        </div>
        <div style={{ borderTop: "1px solid var(--border-stone, rgba(160,120,80,0.12))" }} />
        <div className="animate-pulse grid grid-cols-3 px-5 py-4 gap-6">
          <div className="h-10 rounded-md" style={{ backgroundColor: "var(--border-stone)" }} />
          <div className="h-10 rounded-md" style={{ backgroundColor: "var(--border-stone)" }} />
          <div className="h-10 rounded-md" style={{ backgroundColor: "var(--border-stone)" }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      {/* ── Fila superior: número grande + controles ── */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className="text-xs uppercase tracking-wider font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            Patrimonio Total
          </p>

          {/* Número grande + sparkline */}
          <div className="flex items-end gap-4 mt-1">
            <p
              className="font-heading text-5xl sm:text-6xl font-semibold tabular-nums"
              style={{ color: "var(--module-patrimonio)" }}
              aria-label={`Total patrimonio: ${formatEur(totalValue)}`}
            >
              {formatEur(animatedTotal)}
            </p>
            <Sparkline
              values={sparklineValues}
              color="var(--module-patrimonio)"
              width={60}
              height={24}
              className="flex-shrink-0 self-end mb-2"
              opacity={0.7}
            />
          </div>

          {/* Delta mensual */}
          {deltaTotal && (
            <p className="mt-1 font-mono text-sm" style={{ color: deltaColor }}>
              {deltaTotal}
            </p>
          )}
        </div>

        {/* Live badge + privacy toggle */}
        <div className="flex items-center gap-2 flex-shrink-0 pt-1">
          {isLoadingPrices ? (
            <span
              className="animate-pulse rounded-full px-3 py-1 text-xs"
              style={{
                backgroundColor: "rgba(46,125,107,0.1)",
                color: "var(--platform-tr)",
              }}
            >
              Actualizando...
            </span>
          ) : updatedTime ? (
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
              style={{
                backgroundColor: "rgba(46,125,107,0.1)",
                color: "var(--platform-tr)",
              }}
            >
              <span
                className="live-dot h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "var(--platform-tr)" }}
                aria-hidden="true"
              />
              <span className="font-mono">Actualizado {updatedTime}</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={togglePrivacyMode}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150 hover:bg-card"
            style={{ color: "var(--text-secondary)" }}
            aria-label={privacyMode ? "Mostrar valores" : "Ocultar valores"}
          >
            {privacyMode ? (
              <EyeOff size={16} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Eye size={16} strokeWidth={1.75} aria-hidden="true" />
            )}
            <span className="hidden sm:inline text-xs">
              {privacyMode ? "Mostrar" : "Privacidad"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ borderTop: "1px solid var(--border-stone, rgba(160,120,80,0.12))" }} />

      {/* ── 3 sub-métricas ── */}
      <div
        className="grid grid-cols-3"
        style={{
          borderTop: "0",
          // divide-x via inline border-right en las primeras celdas
        }}
      >
        <div style={{ borderRight: "1px solid var(--border-stone, rgba(160,120,80,0.12))" }}>
          <SubMetric
            label="P&L Total"
            value={`${totalPL >= 0 ? "+" : ""}${formatEur(animatedPL)}`}
            subtext={
              deltaTotal
                ? deltaTotalNumeric >= 0
                  ? `+${formatEur(deltaTotalNumeric)} vs mes ant.`
                  : `${formatEur(deltaTotalNumeric)} vs mes ant.`
                : null
            }
            color={plColor}
          />
        </div>
        <div style={{ borderRight: "1px solid var(--border-stone, rgba(160,120,80,0.12))" }}>
          <SubMetric
            label="Rentabilidad"
            value={
              combinedReturnPct !== null ? formatPct(animatedReturn, true) : "—"
            }
            subtext="anualizado"
            color={returnColor}
          />
        </div>
        <div>
          <SubMetric
            label="Capital invertido"
            value={formatEur(animatedCapital)}
            subtext={deltaCapital}
            color="var(--text-secondary)"
          />
        </div>
      </div>
    </div>
  );
}
