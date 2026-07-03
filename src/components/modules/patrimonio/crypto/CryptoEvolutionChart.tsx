"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui";
import { useCryptoStore } from "@/stores/crypto-store";
import type { CryptoAsset } from "@/types/crypto";

import { formatEur } from "@/lib/utils/format";

const formatCompact = (v: number) =>
  new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 0 }).format(v);

interface EvolutionPoint {
  label: string;
  invested: number;
  value: number;
}

function buildEvolutionData(
  transactions: ReturnType<ReturnType<typeof useCryptoStore.getState>["getTransactionsWithAsset"]>,
  assets: CryptoAsset[],
): EvolutionPoint[] {
  const buys = transactions
    .filter((tx) => tx.type === "buy" && tx.transaction_date && tx.asset_id)
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

  if (buys.length === 0) return [];

  // Current price per asset_id (fall back to avg_buy_price)
  const priceMap = new Map<string, number>(
    assets.map((a) => [a.id, a.current_price_eur ?? a.avg_buy_price_eur]),
  );

  // Aggregate by calendar month
  const byMonth = new Map<
    string,
    { label: string; invested: number; qtyByAsset: Map<string, number> }
  >();

  for (const tx of buys) {
    const date = new Date(tx.transaction_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });

    if (!byMonth.has(key)) {
      byMonth.set(key, { label, invested: 0, qtyByAsset: new Map() });
    }
    const entry = byMonth.get(key)!;
    entry.invested += tx.amount_eur ?? 0;

    if (tx.asset_id && tx.quantity) {
      const prev = entry.qtyByAsset.get(tx.asset_id) ?? 0;
      entry.qtyByAsset.set(tx.asset_id, prev + tx.quantity);
    }
  }

  const sorted = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b));

  let cumInvested = 0;
  const cumQty = new Map<string, number>();

  return sorted.map(([, { label, invested, qtyByAsset }]) => {
    cumInvested += invested;

    qtyByAsset.forEach((qty, assetId) => {
      cumQty.set(assetId, (cumQty.get(assetId) ?? 0) + qty);
    });

    // Estimated value = Σ(cumulative qty × current price)
    let cumValue = 0;
    cumQty.forEach((qty, assetId) => {
      const price = priceMap.get(assetId);
      if (price) cumValue += qty * price;
    });

    return {
      label,
      invested: parseFloat(cumInvested.toFixed(2)),
      value: parseFloat(cumValue.toFixed(2)),
    };
  });
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
}

function EvolutionTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const invested = payload.find((p) => p.dataKey === "invested");
  const value    = payload.find((p) => p.dataKey === "value");
  const pl       = invested && value ? value.value - invested.value : null;
  const plPct    = pl !== null && invested && invested.value > 0
    ? (pl / invested.value) * 100
    : null;

  return (
    <div
      className="rounded-lg p-3 text-xs space-y-1.5"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        color: "var(--text-primary)",
        minWidth: "180px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      }}
    >
      <p className="font-medium text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      {invested && (
        <p className="font-mono flex justify-between gap-4">
          <span style={{ color: "var(--module-notas)" }}>Invertido</span>
          <span>{formatEur(invested.value)}</span>
        </p>
      )}
      {value && (
        <p className="font-mono flex justify-between gap-4">
          <span style={{ color: "var(--color-gain)" }}>Valor estimado</span>
          <span>{formatEur(value.value)}</span>
        </p>
      )}
      {pl !== null && plPct !== null && (
        <>
          <div style={{ borderTop: "1px solid var(--border-stone, rgba(160,120,80,0.15))", margin: "4px 0" }} />
          <p className="font-mono flex justify-between gap-4">
            <span style={{ color: "var(--text-muted)" }}>P&L acum.</span>
            <span style={{ color: pl >= 0 ? "var(--color-gain)" : "var(--color-loss)" }}>
              {pl >= 0 ? "+" : ""}{formatEur(pl)} ({plPct >= 0 ? "+" : ""}{plPct.toFixed(1)}%)
            </span>
          </p>
        </>
      )}
    </div>
  );
}

export function CryptoEvolutionChart() {
  const isLoading  = useCryptoStore((s) => s.isLoading);
  const rawAssets  = useCryptoStore((s) => s.assets);
  const getTransactionsWithAsset = useCryptoStore((s) => s.getTransactionsWithAsset);

  const txs  = getTransactionsWithAsset();
  const data = useMemo(
    () => buildEvolutionData(txs, rawAssets),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [txs.length, rawAssets],
  );

  if (isLoading) return <Skeleton className="h-80 rounded-xl" />;

  if (data.length < 2) {
    return (
      <div
        className="rounded-xl p-6 flex items-center justify-center"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          minHeight: "320px",
          color: "var(--text-muted)",
        }}
      >
        <p className="text-sm">Datos insuficientes para mostrar la evolución del portfolio.</p>
      </div>
    );
  }

  const last   = data[data.length - 1];
  const pl     = last.value - last.invested;
  const plPct  = last.invested > 0 ? (pl / last.invested) * 100 : null;
  const isUp   = pl >= 0;

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
            Evolución del portfolio
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Coste acumulado vs valor estimado a precios actuales
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-mono text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
            {formatEur(last.value)}
          </p>
          {plPct !== null && (
            <p className="font-mono text-xs tabular-nums" style={{ color: isUp ? "var(--color-gain)" : "var(--color-loss)" }}>
              {isUp ? "+" : ""}{formatEur(pl)} ({plPct >= 0 ? "+" : ""}{plPct.toFixed(2)}%)
            </p>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradInvCrypto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--module-notas)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--module-notas)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradValCrypto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-gain)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="var(--color-gain)" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--text-muted, var(--text-muted))" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--text-muted, var(--text-muted))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatCompact}
            width={52}
          />
          <Tooltip content={<EvolutionTooltip />} />
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
            formatter={(v: string) => (
              <span style={{ color: "var(--text-muted)" }}>{v}</span>
            )}
          />

          <Area
            type="stepAfter"
            dataKey="invested"
            name="Invertido"
            stroke="var(--module-notas)"
            strokeWidth={1.75}
            fill="url(#gradInvCrypto)"
            dot={false}
            activeDot={{ r: 3, fill: "var(--module-notas)" }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name="Valor estimado"
            stroke="var(--color-gain)"
            strokeWidth={2}
            fill="url(#gradValCrypto)"
            dot={false}
            activeDot={{ r: 4, fill: "var(--color-gain)", strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
