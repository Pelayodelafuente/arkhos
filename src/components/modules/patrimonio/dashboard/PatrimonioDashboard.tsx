"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Landmark,
  TrendingUp,
  BarChart2,
  Coins,
  Bitcoin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { useIndexaStore } from "@/stores/indexa-store";
import { useHorosStore } from "@/stores/horos-store";
import { useCryptoStore } from "@/stores/crypto-store";
import { useMintosStore } from "@/stores/mintos-store";
import { usePatrimonioPrices } from "@/lib/hooks/use-patrimonio-prices";
import { loadCryptoData } from "@/app/actions/crypto";
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
// SyncPlatformsPanel
// ---------------------------------------------------------------------------

type SyncStatus = "idle" | "loading" | "success" | "error";

function TRSyncButton() {
  const { refreshPrices, isRefreshing } = usePatrimonioPrices();
  const [status, setStatus] = useState<SyncStatus>("idle");

  const handleRefresh = useCallback(async () => {
    if (status === "loading" || isRefreshing) return;
    setStatus("loading");
    try {
      await refreshPrices();
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }, [status, isRefreshing, refreshPrices]);

  const isLoading = status === "loading" || isRefreshing;
  const label = isLoading ? "Actualizando…" : status === "success" ? "Actualizado" : status === "error" ? "Error" : "Actualizar";
  const color = status === "success" ? "#2E7D6B" : status === "error" ? "#A32D2D" : "var(--platform-tr)";

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isLoading}
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 disabled:opacity-50"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
      }}
    >
      {status === "success" ? (
        <CheckCircle2 size={13} strokeWidth={2} aria-hidden="true" />
      ) : status === "error" ? (
        <AlertCircle size={13} strokeWidth={2} aria-hidden="true" />
      ) : (
        <RefreshCw size={13} strokeWidth={2} className={isLoading ? "animate-spin" : ""} aria-hidden="true" />
      )}
      {label}
    </button>
  );
}

function CryptoSyncButton() {
  const setAssets = useCryptoStore((s) => s.setAssets);
  const setTransactions = useCryptoStore((s) => s.setTransactions);
  const setDefiPositions = useCryptoStore((s) => s.setDefiPositions);
  const setMonthlyPlan = useCryptoStore((s) => s.setMonthlyPlan);
  const [status, setStatus] = useState<SyncStatus>("idle");

  const handleUpdate = useCallback(async () => {
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/crypto/prices", { method: "POST" });
      if (!res.ok) throw new Error("API error");
      const data = await loadCryptoData();
      if (data) {
        setAssets(data.assets);
        setTransactions(data.transactions);
        setDefiPositions(data.defiPositions);
        setMonthlyPlan(data.monthlyPlan);
      }
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }, [status, setAssets, setTransactions, setDefiPositions, setMonthlyPlan]);

  const isLoading = status === "loading";
  const label = isLoading ? "Actualizando…" : status === "success" ? "Actualizado" : status === "error" ? "Error" : "Actualizar";
  const color = status === "success" ? "#2E7D6B" : status === "error" ? "#A32D2D" : "var(--platform-crypto)";

  return (
    <button
      type="button"
      onClick={handleUpdate}
      disabled={isLoading}
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 disabled:opacity-50"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
      }}
    >
      {status === "success" ? (
        <CheckCircle2 size={13} strokeWidth={2} aria-hidden="true" />
      ) : status === "error" ? (
        <AlertCircle size={13} strokeWidth={2} aria-hidden="true" />
      ) : (
        <RefreshCw size={13} strokeWidth={2} className={isLoading ? "animate-spin" : ""} aria-hidden="true" />
      )}
      {label}
    </button>
  );
}

interface SyncRowProps {
  icon: React.ReactNode;
  color: string;
  name: string;
  description: string;
  action: React.ReactNode;
}

function SyncRow({ icon, color, name, description, action }: SyncRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-3"
      style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.08))" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{name}</p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{description}</p>
        </div>
      </div>
      <div className="flex-shrink-0">{action}</div>
    </div>
  );
}

function ManualBadge({ tooltip }: { tooltip: string }) {
  return (
    <span
      className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs"
      style={{
        backgroundColor: "rgba(136,135,128,0.08)",
        color: "var(--text-muted)",
        border: "1px solid rgba(136,135,128,0.15)",
      }}
      title={tooltip}
    >
      <Info size={11} strokeWidth={2} aria-hidden="true" />
      Manual
    </span>
  );
}

function SyncPlatformsPanel() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <div
        className="px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.15))" }}
      >
        <p className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
          Sincronizar plataformas
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Actualiza los saldos y precios de cada plataforma
        </p>
      </div>

      <div className="px-5">
        <SyncRow
          icon={<Landmark size={14} strokeWidth={1.75} />}
          color="var(--platform-tr)"
          name="Trade Republic"
          description="Precios de mercado en tiempo real (Alpha Vantage)"
          action={<TRSyncButton />}
        />
        <SyncRow
          icon={<Bitcoin size={14} strokeWidth={1.75} />}
          color="var(--platform-crypto)"
          name="Cripto"
          description="Saldos on-chain + precios BTC/ETH/USDC (CoinGecko)"
          action={<CryptoSyncButton />}
        />
        <SyncRow
          icon={<TrendingUp size={14} strokeWidth={1.75} />}
          color="var(--platform-indexa)"
          name="Indexa Capital"
          description="Importa el CSV mensual desde tu área de cliente"
          action={<ManualBadge tooltip="Actualiza el CSV desde app.indexacapital.com" />}
        />
        <SyncRow
          icon={<BarChart2 size={14} strokeWidth={1.75} />}
          color="var(--platform-horos)"
          name="Horos"
          description="Actualiza el VL manualmente desde la ficha del fondo"
          action={<ManualBadge tooltip="Consulta el VL en horos.es o en tu bróker" />}
        />
        <div className="py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: "color-mix(in srgb, var(--platform-mintos) 12%, transparent)", color: "var(--platform-mintos)" }}
                aria-hidden="true"
              >
                <Coins size={14} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>Mintos</p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>Importa el extracto mensual desde el módulo P2P</p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <ManualBadge tooltip="Usa el importador de Mintos en la sección P2P" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const getIndexaValueDelta = useIndexaStore((s) => s.getLastMonthValueDelta);
  const indexaHeaderDelta = getIndexaValueDelta();
  const horosPosition = useHorosStore((s) => s.position);
  const cryptoAssets = useCryptoStore((s) => s.assets);
  const cryptoDefi = useCryptoStore((s) => s.defiPositions);
  const cryptoMonthlyPlan = useCryptoStore((s) => s.monthlyPlan);
  const getCryptoOverview = useCryptoStore((s) => s.getOverview);
  const cryptoOverview = useMemo(() => getCryptoOverview(), [cryptoAssets, cryptoDefi, cryptoMonthlyPlan, getCryptoOverview]);

  const mintosOverview = useMintosStore((s) => s.overview);
  const mintosDeposits = useMintosStore((s) => s.deposits);
  // Fall back to total_value - net_gain when deposits haven't loaded yet (SSR fast path)
  const mintosInvested = mintosDeposits.length > 0
    ? mintosDeposits.reduce((s, d) => s + d.amount, 0)
    : mintosOverview
      ? mintosOverview.total_value - mintosOverview.net_gain
      : 0;

  // Global total: TR + Indexa + Horos + Mintos + Crypto
  const totalValue =
    (overview?.total_value ?? 0) +
    (indexaOverview?.total_value ?? 0) +
    (horosPosition?.total_value ?? 0) +
    (mintosOverview?.total_value ?? 0) +
    (cryptoOverview?.total_value_eur ?? 0);
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
      currentValue: mintosOverview?.total_value ?? null,
      totalInvested: mintosInvested > 0 ? mintosInvested : null,
      plAmount: mintosOverview?.net_gain ?? null,
      plPercentage: mintosInvested > 0 && mintosOverview
        ? parseFloat(((mintosOverview.net_gain / mintosInvested) * 100).toFixed(2))
        : null,
      isActive: activePlatform === "mintos",
    },
    {
      slug: "crypto" as PlatformSlug,
      name: "Cripto",
      description: "Criptomonedas",
      color: "var(--platform-crypto)",
      colorHex: "#B07A3A",
      icon: <Bitcoin size={16} strokeWidth={1.75} aria-hidden="true" />,
      currentValue: cryptoOverview?.total_value_eur ?? null,
      totalInvested: cryptoOverview?.total_invested_eur ?? null,
      plAmount: cryptoOverview?.pl_eur ?? null,
      plPercentage: cryptoOverview?.pl_pct ?? null,
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
          {(() => {
            const combined = (deltas.totalValue ?? 0) + (indexaHeaderDelta ?? 0);
            if (deltas.totalValue === null && indexaHeaderDelta === null) return null;
            return (
              <p
                className="mt-1 font-mono text-sm"
                style={{ color: combined >= 0 ? "var(--platform-tr)" : "#A32D2D" }}
              >
                {combined >= 0 ? "+" : ""}{formatEur(combined)} este mes
              </p>
            );
          })()}
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

      {/* ── SYNC ────────────────────────────────────────────────────────── */}
      <SyncPlatformsPanel />
    </div>
  );
}
