"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui";
import { useHorosStore } from "@/stores/horos-store";
import { HorosKPIs } from "./HorosKPIs";
import { HorosPositionCard } from "./HorosPositionCard";
import { HorosPortfolioChart } from "./HorosPortfolioChart";
import { HorosNAVChart } from "./HorosNAVChart";
import { HorosDCAChart } from "./HorosDCAChart";
import { HorosSectorDonut } from "./HorosSectorDonut";
import { HorosGeoDonut } from "./HorosGeoDonut";
import { HorosTransactionTable } from "./HorosTransactionTable";
import { HorosCostPanel } from "./HorosCostPanel";
import { HorosPlanPanel } from "./HorosPlanPanel";
import { HorosFiscalPanel } from "./HorosFiscalPanel";
import { UpdateNAVModal } from "./UpdateNAVModal";

const HOROS_COLOR = "#7260C4";

const TABS = [
  { id: "dashboard" as const, label: "Resumen" },
  { id: "transactions" as const, label: "Transacciones" },
  { id: "costs" as const, label: "Costes" },
  { id: "plan" as const, label: "Plan de Ahorro" },
  { id: "fiscal" as const, label: "Fiscal" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function HorosDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [showNAVModal, setShowNAVModal] = useState(false);

  const isLoading = useHorosStore((s) => s.isLoading);
  const getOverview = useHorosStore((s) => s.getOverview);
  const getTransactionPerformance = useHorosStore((s) => s.getTransactionPerformance);
  const getDCAChartData = useHorosStore((s) => s.getDCAChartData);
  const getPortfolioChartData = useHorosStore((s) => s.getPortfolioChartData);
  const getNAVChartData = useHorosStore((s) => s.getNAVChartData);
  const getSectorData = useHorosStore((s) => s.getSectorData);
  const getGeoData = useHorosStore((s) => s.getGeoData);
  const getProjection = useHorosStore((s) => s.getProjection);
  const costs = useHorosStore((s) => s.costs);
  const plan = useHorosStore((s) => s.plan);
  const transactions = useHorosStore((s) => s.transactions);

  const overview = getOverview();
  const txPerformance = getTransactionPerformance();
  const dcaData = getDCAChartData();
  const portfolioData = getPortfolioChartData();
  const navData = getNAVChartData();
  const sectorData = getSectorData();
  const geoData = getGeoData();

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
      {/* KPIs */}
      <HorosKPIs overview={overview} isLoading={isLoading} />

      {/* Tabs */}
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
                    backgroundColor: `color-mix(in srgb, ${HOROS_COLOR} 12%, transparent)`,
                    color: HOROS_COLOR,
                  }
                : { color: "var(--text-muted)" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "dashboard" && overview && (
        <div className="space-y-5">
          {/* Position card + portfolio chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HorosPositionCard overview={overview} onUpdateNav={() => setShowNAVModal(true)} />
            <HorosPortfolioChart data={portfolioData} />
          </div>

          {/* NAV chart + DCA chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HorosNAVChart data={navData} avgNav={overview.avg_nav} />
            <HorosDCAChart
              data={dcaData}
              currentNav={overview.nav_price}
              avgNav={overview.avg_nav}
            />
          </div>

          {/* Distribution donuts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HorosSectorDonut data={sectorData} />
            <HorosGeoDonut data={geoData} />
          </div>
        </div>
      )}

      {activeTab === "transactions" && (
        <HorosTransactionTable data={txPerformance} />
      )}

      {activeTab === "costs" && <HorosCostPanel costs={costs} currentValue={overview?.total_value ?? 0} />}

      {activeTab === "plan" && (
        <HorosPlanPanel
          plan={plan}
          transactions={transactions}
          getProjection={getProjection}
        />
      )}

      {activeTab === "fiscal" && <HorosFiscalPanel />}

      {/* NAV update modal */}
      {showNAVModal && overview && (
        <UpdateNAVModal
          currentNav={overview.nav_price}
          onClose={() => setShowNAVModal(false)}
          onSuccess={() => setShowNAVModal(false)}
        />
      )}
    </div>
  );
}
