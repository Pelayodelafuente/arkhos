"use client";

import type { PortfolioMarketData } from "@/lib/mercados/portfolio-market";

interface Props {
  data: PortfolioMarketData["riskMetrics"] | undefined;
  isLoading: boolean;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-xl border border-border bg-card animate-pulse ${className}`} />;
}

export function RiskMetricsCard({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return <Skeleton className="h-36" />;
  }

  const { estimatedBeta, usdExposurePct, concentrationRisk, diversificationScore } = data;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-4">
        Métricas de riesgo estimadas
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Beta */}
        <div className="space-y-1">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Beta vs S&P 500</p>
          <p className="font-mono text-xl font-bold text-foreground tabular-nums">
            {estimatedBeta.toFixed(2)}
          </p>
          <p className="text-[11px] text-text-tertiary leading-snug">
            Si el S&P cae 10%, tu cartera caería ~{(estimatedBeta * 10).toFixed(1)}%
          </p>
        </div>

        {/* Exposición USD */}
        <div className="space-y-1">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Exposición USD</p>
          <p className="font-mono text-xl font-bold text-foreground tabular-nums">
            {usdExposurePct.toFixed(0)}%
          </p>
          <p className="text-[11px] text-text-tertiary leading-snug">
            {usdExposurePct > 80 ? "Alta exposición" : usdExposurePct > 60 ? "Exposición moderada" : "Exposición baja"} a fluctuaciones EUR/USD
          </p>
        </div>

        {/* Diversificación */}
        <div className="space-y-1">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Diversificación</p>
          <p className="font-mono text-xl font-bold text-foreground tabular-nums">
            {diversificationScore}
            <span className="text-xs text-text-tertiary font-normal">/100</span>
          </p>
          <div className="h-1.5 w-full rounded-full bg-sand overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${diversificationScore}%`,
                backgroundColor:
                  diversificationScore > 70
                    ? "var(--color-success)"
                    : diversificationScore > 50
                    ? "var(--color-warning)"
                    : "var(--color-error)",
              }}
            />
          </div>
        </div>

        {/* Concentración */}
        <div className="space-y-1">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Riesgo concentración</p>
          <p className="text-sm text-text-secondary leading-snug mt-1">{concentrationRisk}</p>
        </div>
      </div>
    </div>
  );
}
