"use client";

import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CryptoData } from "@/lib/mercados/assets";
import { ChartWrapper } from "../ChartWrapper";

const C = {
  violet: "var(--color-mercados)",
  terracota: "var(--color-terracota)",
  success: "var(--color-success)",
  error: "var(--color-error)",
} as const;

interface Props {
  data: CryptoData;
  isLoading: boolean;
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card animate-pulse ${className}`} />
  );
}

function ChangeBadge({ pct }: { pct: number }) {
  const pos = pct >= 0;
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        pos
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-red-50 text-red-700 border border-red-200",
      ].join(" ")}
    >
      {pos ? "+" : ""}
      {pct.toFixed(2)}%
    </span>
  );
}

function fearGreedLabel(value: number): { label: string; colorClass: string } {
  if (value <= 25) return { label: "Miedo extremo", colorClass: "text-red-600" };
  if (value <= 45) return { label: "Miedo", colorClass: "text-orange-500" };
  if (value <= 55) return { label: "Neutral", colorClass: "text-amber-500" };
  if (value <= 75) return { label: "Avaricia", colorClass: "text-lime-600" };
  return { label: "Avaricia extrema", colorClass: "text-green-600" };
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2).replace('.', ',')} T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1).replace('.', ',')} B`;
  return `$${(value / 1e6).toFixed(0)} M`;
}

function Sparkline({
  data,
  color,
  gradientId,
}: {
  data: Array<{ date: string; value: number }>;
  color: string;
  gradientId: string;
}) {
  return (
    <ChartWrapper minHeight={80}>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <Tooltip
            formatter={(v: unknown) => [`$${(v as number).toLocaleString("en-US")}`, ""]}
            contentStyle={{
              fontSize: 12,
              border: "1px solid var(--color-border)",
              borderRadius: 8,
            }}
            labelFormatter={(label) => String(label)}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

export function CryptoSection({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  const { bitcoin: btc, ethereum: eth, totalMarketCap, totalMarketCapChange24h, btcDominance, ethBtcRatio, fearGreed } = data;
  const fg = fearGreedLabel(fearGreed);

  return (
    <div className="space-y-4">
      {/* Fila 1: BTC + ETH */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* BTC Card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-bold"
                style={{ backgroundColor: C.violet }}
                aria-label="Bitcoin"
              >
                ₿
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Bitcoin</p>
                <p className="text-xs text-text-tertiary font-mono">BTC / USD</p>
              </div>
            </div>
            <ChangeBadge pct={btc.changePct24h} />
          </div>

          <p className="font-mono text-3xl font-bold text-foreground tabular-nums">
            ${btc.price.toLocaleString("en-US")}
          </p>

          <Sparkline data={btc.history} color={C.violet} gradientId="btcGrad" />

          <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
            <div>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Market Cap</p>
              <p className="font-mono text-sm font-semibold text-foreground">{formatMarketCap(btc.marketCap)}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Vol 24h</p>
              <p className="font-mono text-sm font-semibold text-foreground">{formatMarketCap(btc.volume24h)}</p>
            </div>
          </div>
        </div>

        {/* ETH Card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-bold"
                style={{ backgroundColor: C.terracota }}
                aria-label="Ethereum"
              >
                Ξ
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Ethereum</p>
                <p className="text-xs text-text-tertiary font-mono">ETH / USD</p>
              </div>
            </div>
            <ChangeBadge pct={eth.changePct24h} />
          </div>

          <p className="font-mono text-3xl font-bold text-foreground tabular-nums">
            ${eth.price.toLocaleString("en-US")}
          </p>

          <Sparkline data={eth.history} color={C.terracota} gradientId="ethGrad" />
        </div>
      </div>

      {/* Fila 2: Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Market Cap Total</p>
          <p className="font-mono text-base font-bold text-foreground tabular-nums">
            {formatMarketCap(totalMarketCap)}
          </p>
          <ChangeBadge pct={totalMarketCapChange24h} />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">BTC Dominance</p>
          <p className="font-mono text-base font-bold text-foreground tabular-nums">
            {btcDominance.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">ETH/BTC Ratio</p>
          <p className="font-mono text-base font-bold text-foreground tabular-nums">
            {ethBtcRatio.toFixed(5)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Fear & Greed</p>
          <p className="font-mono text-base font-bold text-foreground tabular-nums">
            {fearGreed}
          </p>
          <p className={`text-xs font-medium mt-0.5 ${fg.colorClass}`}>{fg.label}</p>
        </div>
      </div>
    </div>
  );
}
