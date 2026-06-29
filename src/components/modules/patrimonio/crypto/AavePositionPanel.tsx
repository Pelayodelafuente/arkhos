"use client";

import { useState } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui";
import { useCryptoStore } from "@/stores/crypto-store";
import { loadCryptoData } from "@/app/actions/crypto";

import { formatEur } from "@/lib/utils/format";

const formatUsdc = (v: number) =>
  new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);

function abbreviateAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function AavePositionPanel() {
  const defiPositions = useCryptoStore((s) => s.defiPositions);
  const assets = useCryptoStore((s) => s.assets);
  const setAssets = useCryptoStore((s) => s.setAssets);
  const setTransactions = useCryptoStore((s) => s.setTransactions);
  const setDefiPositions = useCryptoStore((s) => s.setDefiPositions);
  const setMonthlyPlan = useCryptoStore((s) => s.setMonthlyPlan);
  const isLoading = useCryptoStore((s) => s.isLoading);

  const usdcPriceEur = assets.find((a) => a.symbol === "USDC")?.current_price_eur ?? null;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const position = defiPositions[0] ?? null;

  async function handleUpdate() {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/crypto/prices", { method: "POST" });
      if (!res.ok) return;
      const data = await loadCryptoData();
      if (data) {
        setAssets(data.assets);
        setTransactions(data.transactions);
        setDefiPositions(data.defiPositions);
        setMonthlyPlan(data.monthlyPlan);
      }
      setLastUpdated(new Date());
    } catch {
      // silent fail — UI will retain stale data
    } finally {
      setIsRefreshing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!position) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          color: "var(--text-muted)",
        }}
      >
        <p className="text-sm">No hay posición DeFi registrada.</p>
      </div>
    );
  }

  const deposited = position.deposited_amount ?? 0;
  const current = position.current_amount ?? deposited;
  const apy = position.apy ?? 0;
  const yieldEarned = position.yield_earned ?? current - deposited;
  const projectedYearlyUsdc = current * (apy / 100);

  // EUR equivalents using live USDC price (not 1:1)
  const hasEurRate = usdcPriceEur !== null;
  const eurRate = usdcPriceEur ?? 1;
  const currentEur = current * eurRate;
  const yieldEur = yieldEarned * eurRate;
  const projectedEur = projectedYearlyUsdc * eurRate;

  return (
    <div className="space-y-4">
      {/* Main position card */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          borderLeftColor: "var(--platform-patrimonio, #2E7D6B)",
          borderLeftWidth: "3px",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
              Aave V3 — USDC
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Ethereum mainnet · DeFi yield
            </p>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-mono"
            style={{
              backgroundColor: "rgba(46,125,107,0.10)",
              color: "var(--platform-patrimonio, #2E7D6B)",
              border: "1px solid rgba(46,125,107,0.20)",
            }}
          >
            APY {apy.toFixed(2)}%
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
              Depositado
            </p>
            <p className="font-mono text-lg font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {formatUsdc(deposited)}{" "}
              <span className="text-sm font-normal opacity-60">USDC</span>
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
              Balance actual
            </p>
            <p
              className="font-mono text-lg font-semibold tabular-nums"
              style={{ color: "var(--platform-patrimonio, #2E7D6B)" }}
            >
              {formatUsdc(current)}{" "}
              <span className="text-sm font-normal opacity-60">USDC</span>
            </p>
            {hasEurRate && (
              <p className="font-mono text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                ≈ {formatEur(currentEur)}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
              Intereses ganados
            </p>
            <p
              className="font-mono text-lg font-semibold tabular-nums"
              style={{ color: "var(--platform-patrimonio, #2E7D6B)" }}
            >
              +{formatUsdc(yieldEarned)}{" "}
              <span className="text-sm font-normal opacity-60">USDC</span>
            </p>
            {hasEurRate && (
              <p className="font-mono text-xs mt-0.5" style={{ color: "var(--platform-patrimonio, #2E7D6B)" }}>
                ≈ +{formatEur(yieldEur)}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
              Tipo cambio
            </p>
            <p className="font-mono text-lg font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {hasEurRate ? formatEur(eurRate) : "—"}
              <span className="text-sm font-normal opacity-60"> /USDC</span>
            </p>
            {hasEurRate && (
              <p className="font-mono text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Total: {formatEur(currentEur)}
              </p>
            )}
          </div>
        </div>

        {/* Wallet address */}
        {position.wallet_address && (
          <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            <ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" />
            <span className="font-mono text-xs" title={position.wallet_address}>
              {abbreviateAddress(position.wallet_address)}
            </span>
          </div>
        )}
      </div>

      {/* Projection card */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
          Proyeccion a 12 meses (APY actual)
        </p>
        <p className="font-mono text-lg font-semibold tabular-nums" style={{ color: "var(--platform-crypto)" }}>
          +{formatUsdc(projectedYearlyUsdc)} USDC
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          ≈ {hasEurRate ? formatEur(projectedEur) : `${formatUsdc(projectedYearlyUsdc)} USDC`} · a {apy.toFixed(2)}% APY
        </p>

        {lastUpdated && (
          <p className="text-xs mt-2 font-mono" style={{ color: "var(--text-muted)" }}>
            Actualizado:{" "}
            {lastUpdated.toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {/* Update button */}
      <button
        type="button"
        onClick={handleUpdate}
        disabled={isRefreshing}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 disabled:opacity-50"
        style={{
          backgroundColor: "color-mix(in srgb, var(--platform-crypto) 10%, transparent)",
          color: "var(--platform-crypto)",
          border: "1px solid color-mix(in srgb, var(--platform-crypto) 20%, transparent)",
        }}
        aria-label="Actualizar posición Aave desde blockchain"
      >
        <RefreshCw
          size={14}
          strokeWidth={2}
          aria-hidden="true"
          className={isRefreshing ? "animate-spin" : ""}
        />
        {isRefreshing ? "Actualizando…" : "Actualizar Aave"}
      </button>
    </div>
  );
}
