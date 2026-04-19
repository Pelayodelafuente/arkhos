"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui";
import { useCryptoStore } from "@/stores/crypto-store";
import type { CryptoDCAPoint } from "@/types/crypto";

const formatEur = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const COLOR_BELOW = "#2E7D6B"; // Verde: comprado por debajo del precio actual
const COLOR_ABOVE = "#B07A3A"; // Naranja crypto: comprado por encima

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: CryptoDCAPoint }>;
}

function DCATooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg p-3 text-xs space-y-1"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        color: "var(--text-primary)",
        minWidth: "160px",
      }}
    >
      <p className="font-medium">{new Date(d.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</p>
      <p className="font-mono">Precio: {formatEur(d.price_eur)}</p>
      <p className="font-mono">Cantidad: {d.quantity.toFixed(8)} BTC</p>
      <p className="font-mono">Importe: {formatEur(d.amount_eur)}</p>
    </div>
  );
}

export function CryptoDCAChart() {
  const getBTCDCAChart = useCryptoStore((s) => s.getBTCDCAChart);
  const isLoading = useCryptoStore((s) => s.isLoading);
  const assets = useCryptoStore((s) => s.assets);

  const data = getBTCDCAChart();
  const btcAsset = assets.find((a) => a.symbol === "BTC");
  const currentPrice = btcAsset?.current_price_eur ?? btcAsset?.avg_buy_price_eur ?? 0;

  if (isLoading) {
    return <Skeleton className="h-80 rounded-xl" />;
  }

  if (data.length === 0) {
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
        <p className="text-sm">Sin compras de BTC registradas.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
          DCA Bitcoin — {data.length} compras
        </p>
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOR_BELOW }} aria-hidden="true" />
            Por debajo del precio actual
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOR_ABOVE }} aria-hidden="true" />
            Por encima
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              new Intl.NumberFormat("es-ES", {
                notation: "compact",
                maximumFractionDigits: 0,
              }).format(v)
            }
          />
          <Tooltip content={<DCATooltip />} cursor={{ fill: "rgba(160,120,80,0.06)" }} />
          {currentPrice > 0 && (
            <ReferenceLine
              y={currentPrice}
              stroke="var(--text-muted)"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: `Actual: ${new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 0 }).format(currentPrice)}€`,
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--text-muted)",
              }}
            />
          )}
          <Bar dataKey="price_eur" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.is_above_current ? COLOR_BELOW : COLOR_ABOVE}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
