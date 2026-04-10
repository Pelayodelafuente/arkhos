"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PortfolioTransaction, PortfolioAsset } from "@/types/patrimonio";
import { CATEGORY_COLORS } from "@/types/patrimonio";

interface RechartsPayloadItem {
  dataKey?: string;
  value?: number;
  name?: string;
}

interface RechartsBarTooltipProps {
  active?: boolean;
  payload?: readonly RechartsPayloadItem[];
  label?: string;
}

interface MonthlyContributionChartProps {
  transactions: PortfolioTransaction[];
  assets: PortfolioAsset[];
}

interface MonthData {
  month: string;
  [assetId: string]: number | string;
}

const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const FALLBACK_COLORS = [
  "#2E7D6B",
  "#3B78B0",
  "#7260C4",
  "#B07A3A",
  "#C4704A",
  "#E67E22",
  "#9B7A4A",
  "#888780",
];

function getAssetColor(asset: PortfolioAsset, index: number): string {
  return CATEGORY_COLORS[asset.category] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function formatMonthLabel(yyyyMM: string): string {
  try {
    const [year, month] = yyyyMM.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
  } catch {
    return yyyyMM;
  }
}

function CustomTooltip({
  active,
  payload,
  label,
  assets,
  assetIds,
}: RechartsBarTooltipProps & { assets: PortfolioAsset[]; assetIds: string[] }) {
  if (!active || !payload || payload.length === 0) return null;

  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);

  return (
    <div
      className="rounded-xl px-3 py-2.5 text-xs"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-modal)",
        minWidth: 160,
      }}
    >
      <p className="mb-2 font-medium" style={{ color: "var(--foreground)" }}>
        {label}
      </p>
      {assetIds.map((id, i) => {
        const asset = assets.find((a) => a.id === id);
        const entry = payload.find((p) => p.dataKey === id);
        const val = entry?.value ?? 0;
        if (!val) return null;
        return (
          <div key={id} className="flex items-center justify-between gap-3 py-0.5">
            <span style={{ color: getAssetColor(asset!, i) }}>
              {asset?.ticker ?? asset?.name.slice(0, 12) ?? id.slice(0, 8)}
            </span>
            <span className="font-mono" style={{ color: "var(--foreground)" }}>
              {fmt.format(val)}
            </span>
          </div>
        );
      })}
      <div
        className="mt-1.5 flex items-center justify-between gap-3 border-t pt-1.5"
        style={{ borderColor: "var(--border)" }}
      >
        <span style={{ color: "var(--text-secondary)" }}>Total</span>
        <span className="font-mono font-medium" style={{ color: "var(--module-patrimonio)" }}>
          {fmt.format(total)}
        </span>
      </div>
    </div>
  );
}

export function MonthlyContributionChart({ transactions, assets }: MonthlyContributionChartProps) {
  const planTxs = transactions.filter((t) => t.type === "savings_plan");

  if (planTxs.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center">
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Importa el historial para ver este gráfico
        </p>
      </div>
    );
  }

  // Build month → assetId → total map
  const monthMap = new Map<string, Map<string, number>>();
  for (const tx of planTxs) {
    const month = tx.transaction_date.slice(0, 7);
    if (!monthMap.has(month)) monthMap.set(month, new Map());
    const assetMap = monthMap.get(month)!;
    const assetId = tx.asset_id ?? "__unknown__";
    assetMap.set(assetId, (assetMap.get(assetId) ?? 0) + tx.total_amount);
  }

  const sortedMonths = [...monthMap.keys()].sort();

  // Collect all asset ids involved
  const assetIdSet = new Set<string>();
  for (const m of monthMap.values()) {
    for (const id of m.keys()) assetIdSet.add(id);
  }
  const assetIds = [...assetIdSet];

  const data: MonthData[] = sortedMonths.map((month) => {
    const assetMap = monthMap.get(month)!;
    const row: MonthData = { month: formatMonthLabel(month) };
    for (const id of assetIds) {
      row[id] = assetMap.get(id) ?? 0;
    }
    return row;
  });

  return (
    <div>
      <p className="mb-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        Contribución mensual — Plan de ahorro
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => `${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}€`}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content={(props: any) => (
              <CustomTooltip {...(props as RechartsBarTooltipProps)} assets={assets} assetIds={assetIds} />
            )}
          />
          {assetIds.map((id, i) => {
            const asset = assets.find((a) => a.id === id);
            return (
              <Bar
                key={id}
                dataKey={id}
                stackId="monthly"
                fill={getAssetColor(asset!, i)}
                name={asset?.ticker ?? asset?.name.slice(0, 12) ?? id.slice(0, 8)}
                radius={i === assetIds.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
