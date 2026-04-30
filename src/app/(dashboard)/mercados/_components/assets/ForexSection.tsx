"use client";

import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ForexData } from "@/lib/mercados/assets";

interface Props {
  data: ForexData;
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

const PAIR_COLORS: Record<string, string> = {
  "EUR/USD": "var(--color-mercados)",
  "USD/JPY": "var(--color-terracota)",
  "EUR/GBP": "var(--color-success)",
  "DXY": "var(--color-warning)",
};

function ForexPairCard({
  pair,
  gradIndex,
}: {
  pair: ForexData["pairs"][number];
  gradIndex: number;
}) {
  const color = PAIR_COLORS[pair.pair] ?? "var(--color-mercados)";
  const gradId = `fxGrad${gradIndex}`;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{pair.pair}</p>
          <p className="text-xs text-text-tertiary">{pair.label}</p>
        </div>
        <ChangeBadge pct={pair.changePct24h} />
      </div>

      <p className="font-mono text-2xl font-bold text-foreground tabular-nums">
        {pair.value.toFixed(4)}
      </p>

      <ResponsiveContainer width="100%" height={80}>
        <AreaChart
          data={pair.history}
          margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <Tooltip
            formatter={(v: unknown) => [(v as number).toFixed(4), pair.pair]}
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
            fill={`url(#${gradId})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      <p className="text-[11px] text-text-tertiary leading-snug border-t border-border pt-2">
        {pair.relevance}
      </p>
    </div>
  );
}

export function ForexSection({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
        <Skeleton className="h-36" />
      </div>
    );
  }

  const { pairs, portfolioExposureAnalysis: pea } = data;

  return (
    <div className="space-y-4">
      {/* Grid 2x2 de pares */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {pairs.map((pair, i) => (
          <ForexPairCard key={pair.pair} pair={pair} gradIndex={i} />
        ))}
      </div>

      {/* Card de exposición de cartera */}
      <div className="rounded-xl border border-border bg-sand p-5 space-y-4">
        <p className="text-sm font-medium text-text-secondary">
          Exposición EUR/USD — Tu Cartera
        </p>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">EUR/USD</p>
            <p className="font-mono text-lg font-bold text-foreground tabular-nums">
              {pea.eurUsdRate.toFixed(4)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Exposición USD</p>
            <p className="font-mono text-lg font-bold text-foreground tabular-nums">
              {pea.usdExposurePct.toFixed(0)}%
            </p>
          </div>
          <div>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Impacto ±10%</p>
            <p className="font-mono text-lg font-bold text-foreground tabular-nums">
              ±€{pea.impactOf10pctMove.toLocaleString("en-US")}
            </p>
          </div>
        </div>

        <p className="text-xs text-text-secondary border-t border-border pt-3 leading-relaxed">
          {pea.message}
        </p>
      </div>
    </div>
  );
}
