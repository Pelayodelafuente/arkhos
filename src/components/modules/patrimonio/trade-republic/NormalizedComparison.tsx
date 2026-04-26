"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";

export interface NormalizedComparisonProps {
  isins: string[];
  onClose: () => void;
}

// Palette for up to 5 assets. First = gain, second = neutral-fin, rest from brand
const ASSET_COLORS = [
  "#2E7D6B", // color-gain
  "#B07A3A", // color-neutral-fin
  "#7260C4", // mercados
  "#3B78B0", // gastos
  "#C4704A", // proyectos
];

const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

interface AssetKPI {
  id: string;
  name: string;
  ticker?: string;
  currentValue: number;
  plAmount: number;
  plPercentage: number;
  color: string;
}

export function NormalizedComparison({ isins, onClose }: NormalizedComparisonProps) {
  const assets = usePatrimonioStore((s) => s.assets);

  const matchedAssets = useMemo(
    () =>
      isins
        .map((isin) => assets.find((a) => a.isin === isin))
        .filter((a): a is NonNullable<typeof a> => a !== undefined),
    [isins, assets]
  );

  // price_history is not in the PortfolioAsset type — no chart data available
  // Fall back to KPI cards comparison
  const hasChartData = false;

  const kpis = useMemo<AssetKPI[]>(
    () =>
      matchedAssets.map((asset, idx) => ({
        id: asset.id,
        name: asset.name,
        ticker: asset.ticker,
        currentValue: asset.current_value ?? 0,
        plAmount: asset.pl_amount ?? 0,
        plPercentage: asset.pl_percentage ?? 0,
        color: ASSET_COLORS[idx % ASSET_COLORS.length] ?? "#2E7D6B",
      })),
    [matchedAssets]
  );

  if (matchedAssets.length === 0) {
    return (
      <div
        className="rounded-xl border p-6 text-center"
        style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          No se encontraron activos para los ISINs seleccionados
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-5 py-4"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <h3
            className="font-heading text-base font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Comparación normalizada (base 100)
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
            {matchedAssets.length} activos seleccionados
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          aria-label="Cerrar comparación"
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>

      {/* Chart or fallback */}
      {hasChartData ? (
        // This branch would be reached if price_history were available in the future
        <div className="px-5 py-4">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={[]}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {kpis.map((kpi) => (
                <Line
                  key={kpi.id}
                  type="monotone"
                  dataKey={kpi.name}
                  stroke={kpi.color}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="px-5 py-4">
          <p className="mb-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
            Sin datos históricos suficientes para comparar — mostrando KPIs comparativos
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {kpis.map((kpi) => {
              const isPositive = kpi.plAmount >= 0;
              const plColor = isPositive ? "var(--color-gain)" : "var(--color-loss)";
              return (
                <div
                  key={kpi.id}
                  className="rounded-lg border p-4"
                  style={{
                    borderColor: kpi.color + "40",
                    background: kpi.color + "0D",
                  }}
                >
                  {/* Asset name + color badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: kpi.color }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {kpi.name}
                      </p>
                      {kpi.ticker && (
                        <p
                          className="font-mono text-xs"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {kpi.ticker}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* KPI grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        Valor actual
                      </p>
                      <p
                        className="font-mono text-sm font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {fmt.format(kpi.currentValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        P&L
                      </p>
                      <p
                        className="font-mono text-sm font-semibold"
                        style={{ color: plColor }}
                      >
                        {isPositive ? "+" : ""}
                        {fmt.format(kpi.plAmount)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        Rentabilidad
                      </p>
                      <p
                        className="font-mono text-sm font-semibold"
                        style={{ color: plColor }}
                      >
                        {isPositive ? "+" : ""}
                        {kpi.plPercentage.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
