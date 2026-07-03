"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui";
import { useMintosStore } from "@/stores/mintos-store";
import { MintosKPIs } from "./MintosKPIs";
import { MintosPortfolioHealth } from "./MintosPortfolioHealth";
import { MintosEvolutionChart } from "./MintosEvolutionChart";
import { MintosInterestChart } from "./MintosInterestChart";
import { MintosLoanDistribution } from "./MintosLoanDistribution";
import { MintosGeoDistribution } from "./MintosGeoDistribution";
import { MintosOriginators } from "./MintosOriginators";
import { MintosProjection } from "./MintosProjection";
import { MintosFiscal } from "./MintosFiscal";
import { MintosImporter } from "./MintosImporter";
import { MintosOverviewForm } from "./MintosOverviewForm";
import { MintosHealthForm } from "./MintosHealthForm";

const MINTOS_COLOR = "var(--accent-terracotta)";

const TABS = [
  { id: "dashboard" as const, label: "Resumen" },
  { id: "health" as const, label: "Salud cartera" },
  { id: "distributions" as const, label: "Distribución" },
  { id: "projection" as const, label: "Proyección" },
  { id: "import" as const, label: "Importar" },
  { id: "fiscal" as const, label: "Fiscal" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function MintosDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  const isLoading = useMintosStore((s) => s.isLoading);
  const plan = useMintosStore((s) => s.plan);
  const portfolioHealth = useMintosStore((s) => s.portfolioHealth);

  const getKPIs = useMintosStore((s) => s.getKPIs);
  const getHealthSegments = useMintosStore((s) => s.getHealthSegments);
  const getEvolutionData = useMintosStore((s) => s.getEvolutionData);
  const getInterestData = useMintosStore((s) => s.getInterestData);
  const getDistributionByDimension = useMintosStore((s) => s.getDistributionByDimension);

  const kpis = getKPIs();
  const healthSegments = getHealthSegments();
  const evolutionData = getEvolutionData();
  const interestData = getInterestData();
  const loanTypeItems = getDistributionByDimension("loan_type");
  const geoItems = getDistributionByDimension("geography");
  const originatorItems = getDistributionByDimension("originator");

  if (isLoading) {
    return (
      <div className="space-y-4 p-1">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-1">
      {/* KPIs always visible */}
      <MintosKPIs kpis={kpis} isLoading={isLoading} />

      {/* Tabs navigation */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
            style={
              activeTab === tab.id
                ? {
                    backgroundColor: `color-mix(in srgb, ${MINTOS_COLOR} 12%, transparent)`,
                    color: MINTOS_COLOR,
                  }
                : { color: "var(--text-muted)" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Resumen */}
      {activeTab === "dashboard" && (
        <div className="space-y-5">
          {/* Evolution + Interest */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MintosEvolutionChart data={evolutionData} />
            <MintosInterestChart data={interestData} />
          </div>
          {/* Overview info row — editable */}
          <MintosOverviewForm />
        </div>
      )}

      {/* Tab: Salud cartera */}
      {activeTab === "health" && (
        <div className="space-y-4">
          <MintosPortfolioHealth
            segments={healthSegments}
            snapshotDate={portfolioHealth?.snapshot_date}
          />
          <MintosHealthForm />
        </div>
      )}

      {/* Tab: Distribución */}
      {activeTab === "distributions" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MintosLoanDistribution items={loanTypeItems} />
            <MintosGeoDistribution items={geoItems} />
          </div>
          <MintosOriginators items={originatorItems} />
        </div>
      )}

      {/* Tab: Proyección */}
      {activeTab === "projection" && (
        <MintosProjection kpis={kpis} plan={plan} />
      )}

      {/* Tab: Importar */}
      {activeTab === "import" && <MintosImporter />}

      {/* Tab: Fiscal */}
      {activeTab === "fiscal" && <MintosFiscal />}
    </div>
  );
}
