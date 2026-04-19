"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui";
import { useCryptoStore } from "@/stores/crypto-store";

const formatEur = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const CORE_SYMBOLS = new Set(["BTC", "ETH", "USDC"]);

const DEFAULT_COLORS: Record<string, string> = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  USDC: "#2775CA",
  Altcoins: "#8D8D8D",
};

interface SliceItem {
  name: string;
  value: number;
  pct: number;
  color: string;
}

interface DonutTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SliceItem }>;
}

function DonutTooltip({ active, payload }: DonutTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg p-2.5 text-xs space-y-0.5"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        color: "var(--text-primary)",
      }}
    >
      <p className="font-medium">{d.name}</p>
      <p className="font-mono">{formatEur(d.value)}</p>
      <p className="font-mono" style={{ color: "var(--text-muted)" }}>
        {d.pct.toFixed(1)}%
      </p>
    </div>
  );
}

export function CryptoDistributionDonut() {
  const isLoading = useCryptoStore((s) => s.isLoading);
  const getAssetsWithPL = useCryptoStore((s) => s.getAssetsWithPL);

  const assets = getAssetsWithPL();

  if (isLoading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  if (assets.length === 0) {
    return (
      <div
        className="rounded-xl p-6 flex items-center justify-center"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          minHeight: "256px",
          color: "var(--text-muted)",
        }}
      >
        <p className="text-sm">Sin activos.</p>
      </div>
    );
  }

  const totalValue = assets.reduce((s, a) => s + a.current_value_eur, 0);

  const coreSlices: SliceItem[] = assets
    .filter((a) => CORE_SYMBOLS.has(a.symbol))
    .map((a) => ({
      name: a.symbol,
      value: a.current_value_eur,
      pct: totalValue > 0 ? (a.current_value_eur / totalValue) * 100 : 0,
      color: a.color ?? DEFAULT_COLORS[a.symbol] ?? "var(--platform-crypto)",
    }));

  const altcoinsValue = assets
    .filter((a) => !CORE_SYMBOLS.has(a.symbol))
    .reduce((s, a) => s + a.current_value_eur, 0);

  const slices: SliceItem[] = [
    ...coreSlices,
    ...(altcoinsValue > 0
      ? [
          {
            name: "Altcoins",
            value: altcoinsValue,
            pct: totalValue > 0 ? (altcoinsValue / totalValue) * 100 : 0,
            color: DEFAULT_COLORS["Altcoins"],
          },
        ]
      : []),
  ];

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <p className="font-heading text-base mb-3" style={{ color: "var(--text-primary)" }}>
        Distribucion del portfolio
      </p>

      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="relative flex-shrink-0" style={{ width: 160, height: 160 }}>
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={slices}
                cx={75}
                cy={75}
                innerRadius={50}
                outerRadius={70}
                dataKey="value"
                strokeWidth={1}
                stroke="var(--bg-card)"
              >
                {slices.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <span className="font-mono text-xs font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {new Intl.NumberFormat("es-ES", {
                notation: "compact",
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              }).format(totalValue)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <ul className="flex-1 space-y-2" role="list">
          {slices.map((s) => (
            <li key={s.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: s.color }}
                  aria-hidden="true"
                />
                <span className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
                  {s.name}
                </span>
              </div>
              <span className="font-mono text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                {s.pct.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
