"use client";

import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { CryptoAssetWithPL } from "@/types/crypto";

const formatEur = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const formatPct = (v: number) =>
  `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

function abbreviateAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatQuantity(symbol: string, qty: number): string {
  if (symbol === "BTC") return qty.toFixed(8);
  if (symbol === "ETH") return qty.toFixed(6);
  return qty.toFixed(2);
}

const WALLET_LABELS: Record<string, string> = {
  trust_wallet: "Trust Wallet",
  metamask: "MetaMask",
  bit2me: "Bit2Me",
  aave: "Aave",
};

interface CryptoAssetCardProps {
  asset: CryptoAssetWithPL;
}

export function CryptoAssetCard({ asset }: CryptoAssetCardProps) {
  const hasPL = asset.has_live_price && asset.pl_eur !== null && asset.pl_pct !== null;
  const isPositive = hasPL ? (asset.pl_eur as number) >= 0 : true;
  const plColor = isPositive ? "var(--platform-patrimonio, #2E7D6B)" : "#A32D2D";
  const assetColor = asset.color ?? "var(--platform-crypto)";
  const currentPrice = asset.current_price_eur;
  const showLossAlert = hasPL && (asset.pl_pct as number) < -30;

  const progressPct =
    currentPrice !== null && asset.avg_buy_price_eur > 0
      ? Math.min((currentPrice / asset.avg_buy_price_eur) * 100, 200)
      : null;

  return (
    <motion.div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        borderLeftColor: assetColor,
        borderLeftWidth: "3px",
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: assetColor }}
            aria-hidden="true"
          />
          <div>
            <p className="font-heading text-base leading-tight" style={{ color: "var(--text-primary)" }}>
              {asset.name}
            </p>
            <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              {asset.symbol}
            </p>
          </div>
        </div>

        {asset.wallet_type && (
          <span
            className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: `color-mix(in srgb, ${assetColor} 10%, transparent)`,
              color: assetColor,
              border: `1px solid color-mix(in srgb, ${assetColor} 20%, transparent)`,
            }}
          >
            {WALLET_LABELS[asset.wallet_type] ?? asset.wallet_type}
          </span>
        )}
      </div>

      {/* Value + quantity */}
      <div>
        <p
          className="font-mono text-2xl font-semibold tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {formatEur(asset.current_value_eur)}
        </p>
        <p className="font-mono text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {formatQuantity(asset.symbol, asset.current_balance)} {asset.symbol}
        </p>
      </div>

      {/* P&L row */}
      {hasPL ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-mono text-sm font-medium tabular-nums"
            style={{ color: plColor }}
          >
            {(asset.pl_eur as number) >= 0 ? "+" : ""}
            {formatEur(asset.pl_eur as number)}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-mono"
            style={{
              backgroundColor: isPositive
                ? "rgba(46,125,107,0.10)"
                : "rgba(163,45,45,0.10)",
              color: plColor,
              border: isPositive
                ? "1px solid rgba(46,125,107,0.20)"
                : "1px solid rgba(163,45,45,0.20)",
            }}
          >
            {formatPct(asset.pl_pct as number)}
          </span>
        </div>
      ) : (
        <div
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
          style={{
            backgroundColor: "rgba(160,120,80,0.06)",
            color: "var(--text-muted)",
            border: "1px solid rgba(160,120,80,0.18)",
          }}
        >
          <RefreshCw size={12} strokeWidth={2} aria-hidden="true" />
          Sin precio en tiempo real — pulsa Actualizar
        </div>
      )}

      {/* Loss alert for deep losses */}
      {showLossAlert && (
        <div
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
          style={{
            backgroundColor: "rgba(163,45,45,0.08)",
            color: "#A32D2D",
            border: "1px solid rgba(163,45,45,0.18)",
          }}
          role="alert"
        >
          <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />
          Posición en pérdidas significativas
        </div>
      )}

      {/* Price progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          <span>Precio medio: {formatEur(asset.avg_buy_price_eur)}</span>
          <span>Actual: {currentPrice !== null ? formatEur(currentPrice) : "—"}</span>
        </div>
        {progressPct !== null && (
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--border, rgba(160,120,80,0.15))" }}
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={200}
            aria-label={`Precio actual vs precio medio: ${progressPct.toFixed(0)}%`}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(progressPct, 100)}%`,
                backgroundColor: isPositive ? "var(--platform-patrimonio, #2E7D6B)" : "#A32D2D",
              }}
            />
          </div>
        )}
      </div>

      {/* Wallet address */}
      {asset.wallet_address && (
        <p
          className="font-mono text-xs"
          style={{ color: "var(--text-muted)" }}
          title={asset.wallet_address}
        >
          {abbreviateAddress(asset.wallet_address)}
        </p>
      )}
    </motion.div>
  );
}
