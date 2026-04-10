"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PortfolioAsset, RiskLevel } from "@/types/patrimonio";
import { RISK_LABELS, RISK_COLORS } from "@/types/patrimonio";

interface RechartsPayloadItem {
  payload?: RiskSlice;
  value?: number;
  name?: string;
}

interface RechartsTooltipProps {
  active?: boolean;
  payload?: readonly RechartsPayloadItem[];
}

interface RiskDistributionChartProps {
  assets: PortfolioAsset[];
}

interface RiskSlice {
  risk: RiskLevel;
  name: string;
  value: number;
  color: string;
}

const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const RISK_ORDER: RiskLevel[] = ["very_low", "low", "medium", "high", "very_high"];

function CustomTooltip({ active, payload, total }: RechartsTooltipProps & { total: number }) {
  if (!active || !payload || payload.length === 0) return null;
  const slice = payload[0]?.payload;
  if (!slice) return null;

  return (
    <div
      className="rounded-xl px-3 py-2.5 text-xs"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-modal)",
      }}
    >
      <p className="mb-1 font-medium" style={{ color: "var(--foreground)" }}>
        {slice.name}
      </p>
      <p style={{ color: "var(--text-secondary)" }}>
        Invertido:{" "}
        <span className="font-mono" style={{ color: slice.color }}>
          {fmt.format(slice.value)}
        </span>
      </p>
      <p style={{ color: "var(--text-secondary)" }}>
        Porcentaje:{" "}
        <span className="font-mono" style={{ color: "var(--foreground)" }}>
          {total > 0 ? ((slice.value / total) * 100).toFixed(1) : "0"}%
        </span>
      </p>
    </div>
  );
}

export function RiskDistributionChart({ assets: propAssets }: RiskDistributionChartProps) {
  const activeAssets = propAssets.filter((a) => a.category !== "cash" && a.total_invested > 0);

  const riskMap = new Map<RiskLevel, number>();
  for (const asset of activeAssets) {
    const current = riskMap.get(asset.risk_level) ?? 0;
    riskMap.set(asset.risk_level, current + asset.total_invested);
  }

  const data: RiskSlice[] = RISK_ORDER.filter((r) => riskMap.has(r)).map((risk) => ({
    risk,
    name: RISK_LABELS[risk],
    value: riskMap.get(risk)!,
    color: RISK_COLORS[risk],
  }));

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center">
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Sin datos disponibles
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center" style={{ height: 280 }}>
      <div className="relative w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              dataKey="value"
              paddingAngle={2}
            >
              {data.map((slice) => (
                <Cell key={slice.risk} fill={slice.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content={(props: any) => <CustomTooltip {...(props as RechartsTooltipProps)} total={total} />}
          />
          </PieChart>
        </ResponsiveContainer>

        {/* Centro del donut */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          style={{ top: 0 }}
        >
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Total
          </span>
          <span
            className="font-mono text-sm font-semibold"
            style={{ color: "var(--module-patrimonio)" }}
          >
            {fmt.format(total)}
          </span>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-1 flex w-full flex-wrap justify-center gap-x-4 gap-y-1.5 px-4">
        {data.map((slice) => (
          <div key={slice.risk} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-sm"
              style={{ background: slice.color }}
            />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {slice.name}
            </span>
            <span className="font-mono text-xs" style={{ color: "var(--foreground)" }}>
              {fmt.format(slice.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
