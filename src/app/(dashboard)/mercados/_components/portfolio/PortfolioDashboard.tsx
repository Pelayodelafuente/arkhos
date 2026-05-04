"use client";

import type { PortfolioMarketData } from "@/lib/mercados/portfolio-market";
import { RiskMetricsCard } from "./RiskMetricsCard";
import { AssetAllocationChart } from "./AssetAllocationChart";
import { RebalancePanel } from "./RebalancePanel";
import { BenchmarkChart } from "./BenchmarkChart";
import { CorrelationHeatmap } from "./CorrelationHeatmap";

interface Props {
  data: PortfolioMarketData | null;
  isLoading: boolean;
}

export function PortfolioDashboard({ data, isLoading }: Props) {
  if (!data && !isLoading) {
    return (
      <div className="rounded-xl border border-border bg-sand p-8 text-center">
        <p className="text-sm text-text-secondary">
          Los datos de Mi Cartera se cargarán al activar este tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 mb-4">
        <span className="shrink-0 mt-0.5">ℹ️</span>
        <span>
          Los datos de asignación se calculan a partir de los activos registrados en Arkhos
          (Trade Republic + Crypto). Para cifras exactas, asegúrate de que todas tus
          plataformas están actualizadas en el módulo Patrimonio.
          Los rendimientos comparativos con benchmarks son{' '}
          <strong>estimaciones</strong> basadas en la ponderación por clase de activo.
        </span>
      </div>

      {/* Errores parciales */}
      {data && data.errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="text-xs text-amber-700">
            Algunos datos no pudieron cargarse: {data.errors.join(" · ")}
          </p>
        </div>
      )}

      {/* Fila 1: Métricas de riesgo */}
      <RiskMetricsCard data={data?.riskMetrics} isLoading={isLoading} />

      {/* Fila 2: Asignación + Rebalanceo */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AssetAllocationChart
          data={data?.assetAllocation ?? []}
          isLoading={isLoading}
        />
        <RebalancePanel
          alerts={data?.rebalanceAlerts ?? []}
          isLoading={isLoading}
        />
      </div>

      {/* Fila 3: Benchmarks */}
      <BenchmarkChart data={data?.benchmarkComparison} isLoading={isLoading} />

      {/* Fila 4: Correlaciones */}
      <CorrelationHeatmap data={data?.correlationMatrix} isLoading={isLoading} />
    </div>
  );
}
