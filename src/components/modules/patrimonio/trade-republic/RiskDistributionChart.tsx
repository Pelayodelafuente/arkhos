"use client";

import type { PortfolioAsset, RiskLevel } from "@/types/patrimonio";
import { RISK_LABELS, RISK_COLORS } from "@/types/patrimonio";
import { formatEur } from "@/lib/utils/format";
import { Donut } from "@/components/viz";

interface RiskDistributionChartProps {
  assets: PortfolioAsset[];
}

const RISK_ORDER: RiskLevel[] = ["very_low", "low", "medium", "high", "very_high"];

export function RiskDistributionChart({ assets: propAssets }: RiskDistributionChartProps) {
  const activeAssets = propAssets.filter(
    (a) => a.category !== "cash" && a.total_invested > 0
  );

  const riskMap = new Map<RiskLevel, number>();
  for (const asset of activeAssets) {
    riskMap.set(
      asset.risk_level,
      (riskMap.get(asset.risk_level) ?? 0) + asset.total_invested
    );
  }

  const data = RISK_ORDER.filter((r) => riskMap.has(r)).map((risk) => ({
    name: RISK_LABELS[risk],
    value: riskMap.get(risk)!,
    color: RISK_COLORS[risk],
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center">
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Sin datos disponibles
        </p>
      </div>
    );
  }

  return <Donut data={data} centerLabel="Total" valueFormatter={formatEur} />;
}
