"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Landmark,
  TrendingUp,
  BarChart2,
  Coins,
  Bitcoin,
} from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { useIndexaStore } from "@/stores/indexa-store";
import { useHorosStore } from "@/stores/horos-store";
import type { PlatformSlug } from "@/types/patrimonio";
import { GlobalKPIs } from "@/components/modules/patrimonio/dashboard/GlobalKPIs";
import { PlatformCard, type PlatformCardProps } from "@/components/modules/patrimonio/dashboard/PlatformCard";
import { GlobalEvolutionChart } from "@/components/modules/patrimonio/dashboard/GlobalEvolutionChart";
import { GlobalAllocationDonut } from "@/components/modules/patrimonio/dashboard/GlobalAllocationDonut";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

// ---------------------------------------------------------------------------
// Animated counter hook
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
// Stagger variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// ---------------------------------------------------------------------------
// PatrimonioDashboard
// ---------------------------------------------------------------------------

export function PatrimonioDashboard() {
  const overview = usePatrimonioStore((s) => s.overview);
  const assets = usePatrimonioStore((s) => s.assets);
  const platforms = usePatrimonioStore((s) => s.platforms);
  const pricesLastUpdated = usePatrimonioStore((s) => s.pricesLastUpdated);
  const isLoadingPrices = usePatrimonioStore((s) => s.isLoadingPrices);
  const getKPISparklines = usePatrimonioStore((s) => s.getKPISparklines);
  const getMonthlyKPIDeltas = usePatrimonioStore((s) => s.getMonthlyKPIDeltas);
  const sparklines = getKPISparklines();
  const deltas = getMonthlyKPIDeltas();
  const setActivePlatform = usePatrimonioStore((s) => s.setActivePlatform);
  const activePlatform = usePatrimonioStore((s) => s.activePlatform);
  const privacyMode = usePatrimonioStore((s) => s.privacyMode);
  const togglePrivacyMode = usePatrimonioStore((s) => s.togglePrivacyMode);

  const indexaOverview = useIndexaStore((s) => s.overview);
  const horosPosition = useHorosStore((s) => s.position);

  // Global total: TR + Indexa + Horos
  const totalValue =
    (overview?.total_value ?? 0) +
    (indexaOverview?.total_value ?? 0) +
    (horosPosition?.total_value ?? 0);
  const animatedTotal = useAnimatedCounter(totalValue);

  const updatedTime = useMemo(() => {
    if (!pricesLastUpdated) return null;
    return new Date(pricesLastUpdated).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [pricesLastUpdated]);

  // Build TR data
  const { trValue, trInvested, trPL, trPLPct, trPositions } = useMemo(() => {
    const trPlatform = platforms.find((p) => p.slug === "trade-republic");
    if (!trPlatform) {
      return { trValue: 0, trInvested: 0, trPL: 0, trPLPct: 0, trPositions: 0 };
    }
    const trAssets = assets.filter(
      (a) => a.platform_id === trPlatform.id && a.category !== "cash"
    );
    const val = trAssets.reduce((s, a) => s + (a.current_value ?? 0), 0);
    const inv = trAssets.reduce((s, a) => s + a.total_invested, 0);
    const pl = val - inv;
    const plPct = inv > 0 ? (pl / inv) * 100 : 0;
    const pos = trAssets.filter((a) => (a.current_value ?? 0) > 0).length;
    return { trValue: val, trInvested: inv, trPL: pl, trPLPct: plPct, trPositions: pos };
  }, [assets, platforms]);

  type CardDef = Omit<PlatformCardProps, "onClick">;

  const PLATFORM_CARDS: CardDef[] = [
    {
      slug: "trade-republic" as PlatformSlug,
      name: "Trade Republic",
      description: "Acciones y ETFs",
      color: "var(--platform-tr)",
      colorHex: "#2E7D6B",
      icon: <Landmark size={16} strokeWidth={1.75} aria-hidden="true" />,
      currentValue: trValue > 0 ? trValue : null,
      totalInvested: trInvested > 0 ? trInvested : null,
      plAmount: trValue > 0 ? trPL : null,
      plPercentage: trValue > 0 ? trPLPct : null,
      sparklineData: sparklines.totalValue,
      positionsCount: trPositions,
      lastUpdated: pricesLastUpdated,
      isActive: activePlatform === "trade-republic",
    },
    {
      slug: "indexa" as PlatformSlug,
      name: "Indexa Capital",
      description: "Fondos indexados globales",
      color: "var(--platform-indexa)",
      colorHex: "#3B78B0",
      icon: <TrendingUp size={16} strokeWidth={1.75} aria-hidden="true" />,
      currentValue: indexaOverview?.total_value ?? null,
      totalInvested: indexaOverview?.total_cost ?? null,
      plAmount: indexaOverview?.total_gain ?? null,
      plPercentage: indexaOverview?.total_gain_pct ?? null,
      positionsCount: indexaOverview?.positions_count,
      isActive: activePlatform === "indexa",
    },
    {
      slug: "horos" as PlatformSlug,
      name: "Horos",
      description: "Gestión activa value",
      color: "var(--platform-horos)",
      colorHex: "#7260C4",
      icon: <BarChart2 size={16} strokeWidth={1.75} aria-hidden="true" />,
      currentValue: horosPosition?.total_value ?? null,
      totalInvested: horosPosition?.total_cost ?? null,
      plAmount: horosPosition?.unrealized_gain ?? null,
      plPercentage: horosPosition?.unrealized_gain_pct ?? null,
      positionsCount: horosPosition ? 1 : undefined,
      isActive: activePlatform === "horos",
    },
    {
      slug: "mintos" as PlatformSlug,
      name: "Mintos",
      description: "P2P Lending",
      color: "var(--platform-mintos)",
      colorHex: "#C4704A",
      icon: <Coins size={16} strokeWidth={1.75} aria-hidden="true" />,
      currentValue: null,
      totalInvested: null,
      plAmount: null,
      plPercentage: null,
      isActive: activePlatform === "mintos",
    },
    {
      slug: "crypto" as PlatformSlug,
      name: "Cripto",
      description: "Criptomonedas",
      color: "var(--platform-crypto)",
      colorHex: "#B07A3A",
      icon: <Bitcoin size={16} strokeWidth={1.75} aria-hidden="true" />,
      currentValue: null,
      totalInvested: null,
      plAmount: null,
      plPercentage: null,
      isActive: activePlatform === "crypto",
    },
  ];

  return (
    <div className="space-y-7">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl text-foreground">Patrimonio</h1>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <p
              className="font-heading text-5xl font-semibold tabular-nums"
              style={{ color: "var(--module-patrimonio)" }}
              aria-label={`Total patrimonio: ${formatEur(totalValue)}`}
            >
              {formatEur(animatedTotal)}
            </p>
          </div>

          {/* Monthly delta */}
          {deltas.totalValue !== null && (
            <p
              className="mt-1 font-mono text-sm"
              style={{ color: deltas.totalValue >= 0 ? "var(--platform-tr)" : "#A32D2D" }}
            >
              {deltas.totalValue >= 0 ? "+" : ""}{formatEur(deltas.totalValue)} este mes
            </p>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Updated indicator */}
          {isLoadingPrices ? (
            <span className="animate-pulse rounded-full px-3 py-1 text-xs" style={{ backgroundColor: "rgba(46,125,107,0.1)", color: "var(--platform-tr)" }}>
              Actualizando...
            </span>
          ) : updatedTime ? (
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
              style={{ backgroundColor: "rgba(46,125,107,0.1)", color: "var(--platform-tr)" }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: "var(--platform-tr)" }}
                aria-hidden="true"
              />
              <span className="font-mono">Actualizado {updatedTime}</span>
            </div>
          ) : null}

          {/* Privacy toggle */}
          <button
            type="button"
            onClick={togglePrivacyMode}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150 hover:bg-card"
            style={{ color: "var(--text-secondary)" }}
            aria-label={privacyMode ? "Mostrar valores" : "Ocultar valores"}
          >
            {privacyMode
              ? <EyeOff size={16} strokeWidth={1.75} aria-hidden="true" />
              : <Eye size={16} strokeWidth={1.75} aria-hidden="true" />}
            <span className="hidden sm:inline text-xs">{privacyMode ? "Mostrar" : "Privacidad"}</span>
          </button>
        </div>
      </div>

      {/* ── GLOBAL KPIs ─────────────────────────────────────────────────── */}
      <GlobalKPIs />

      {/* ── PLATAFORMAS ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 font-heading text-lg text-foreground">Tus plataformas</h2>
        <motion.div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {PLATFORM_CARDS.map((card) => (
            <motion.div key={card.slug} variants={cardVariants}>
              <PlatformCard
                {...card}
                onClick={() => setActivePlatform(card.slug)}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── CHARTS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GlobalEvolutionChart />
        </div>
        <div className="lg:col-span-1">
          <GlobalAllocationDonut />
        </div>
      </div>
    </div>
  );
}
