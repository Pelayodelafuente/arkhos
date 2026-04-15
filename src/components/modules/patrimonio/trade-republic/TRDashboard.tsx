"use client";

import { useState } from "react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { PLBadge } from "@/components/modules/patrimonio/shared/PLBadge";
import { PriceStatusBanner } from "@/components/modules/patrimonio/shared/PriceStatusBanner";
import { SavingsPlanPanel } from "./SavingsPlanPanel";
import { TRChartsPanel } from "./TRChartsPanel";
import { TRPositionsTable } from "./TRPositionsTable";
import { PassiveIncomePanel } from "./PassiveIncomePanel";
import { EvolutionChart } from "./EvolutionChart";
import { MonthlyContributionChart } from "./MonthlyContributionChart";

type Tab = "overview" | "cartera" | "plan" | "analisis" | "ingresos";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "cartera", label: "Cartera" },
  { key: "plan", label: "Plan de Ahorro" },
  { key: "analisis", label: "Análisis" },
  { key: "ingresos", label: "Ingresos Pasivos" },
];

function YearFilter() {
  const selectedYear = usePatrimonioStore((s) => s.selectedYear);
  const setSelectedYear = usePatrimonioStore((s) => s.setSelectedYear);
  const getAvailableYears = usePatrimonioStore((s) => s.getAvailableYears);
  const years = getAvailableYears();

  const options = [{ value: "all", label: "Total" }, ...years.map((y) => ({ value: y, label: y }))];

  return (
    <div className="flex items-center gap-1.5">
      <span className="mr-1 text-xs text-text-tertiary">Periodo:</span>
      {options.map(({ value, label }) => {
        const active = selectedYear === value;
        return (
          <button
            key={value}
            onClick={() => setSelectedYear(value as string)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: active ? "var(--module-patrimonio)" : "var(--bg-sand)",
              color: active ? "#fff" : "var(--text-secondary)",
              border: `1px solid ${active ? "var(--module-patrimonio)" : "var(--border)"}`,
            }}
            aria-pressed={active}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

function TopPerformers() {
  const getTopGainers = usePatrimonioStore((s) => s.getTopGainers);
  const getTopLosers = usePatrimonioStore((s) => s.getTopLosers);

  const gainers = getTopGainers(3);
  const losers = getTopLosers(3);

  if (gainers.length === 0 && losers.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Mejores posiciones
        </h4>
        <div className="space-y-2.5">
          {gainers.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{asset.name}</p>
                <p className="font-mono text-xs text-text-tertiary">{asset.ticker ?? "—"}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="font-mono text-sm font-medium text-foreground">
                  {formatEur(asset.current_value ?? 0)}
                </p>
                {asset.pl_amount != null && asset.pl_percentage != null && (
                  <div className="mt-0.5">
                    <PLBadge
                      amount={asset.pl_amount}
                      percentage={asset.pl_percentage}
                      showPercentage
                      size="sm"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Peores posiciones
        </h4>
        <div className="space-y-2.5">
          {losers.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{asset.name}</p>
                <p className="font-mono text-xs text-text-tertiary">{asset.ticker ?? "—"}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="font-mono text-sm font-medium text-foreground">
                  {formatEur(asset.current_value ?? 0)}
                </p>
                {asset.pl_amount != null && asset.pl_percentage != null && (
                  <div className="mt-0.5">
                    <PLBadge
                      amount={asset.pl_amount}
                      percentage={asset.pl_percentage}
                      showPercentage
                      size="sm"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TRDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const transactions = usePatrimonioStore((s) => s.transactions);
  const assets = usePatrimonioStore((s) => s.assets);

  return (
    <div className="space-y-5">
      {/* Always-visible price status */}
      <PriceStatusBanner />

      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: isActive ? "var(--module-patrimonio)" : "var(--bg-card)",
                color: isActive ? "white" : "var(--text-secondary)",
                border: `1px solid ${isActive ? "var(--module-patrimonio)" : "var(--border)"}`,
              }}
              aria-pressed={isActive}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Evolución del patrimonio</h3>
            <EvolutionChart height={420} />
          </div>
          <TopPerformers />
        </div>
      )}

      {/* Tab: Cartera */}
      {activeTab === "cartera" && <TRPositionsTable />}

      {/* Tab: Plan de Ahorro */}
      {activeTab === "plan" && (
        <div className="space-y-5">
          <SavingsPlanPanel />
          <div className="rounded-xl border border-border bg-card p-5">
            <h4 className="mb-4 text-sm font-semibold text-foreground">
              Aportaciones mensuales al plan
            </h4>
            <MonthlyContributionChart transactions={transactions} assets={assets} />
          </div>
        </div>
      )}

      {/* Tab: Análisis */}
      {activeTab === "analisis" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-tertiary">Filtra los gráficos por año</p>
            <YearFilter />
          </div>
          <TRChartsPanel />
        </div>
      )}

      {/* Tab: Ingresos Pasivos */}
      {activeTab === "ingresos" && <PassiveIncomePanel />}
    </div>
  );
}
