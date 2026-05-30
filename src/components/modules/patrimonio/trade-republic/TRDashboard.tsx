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
import { PositionTreemap } from "./PositionTreemap";
import { FiscalidadPanel } from "./FiscalidadPanel";
import { MetricasAvanzadasPanel } from "./MetricasAvanzadasPanel";
import { SimuladorProyeccion } from "./SimuladorProyeccion";
import { CapitalVsReturnChart } from "./CapitalVsReturnChart";
import dynamic from "next/dynamic";

const ReturnHeatmap = dynamic(
  () => import("./ReturnHeatmap").then((m) => ({ default: m.ReturnHeatmap })),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse rounded-xl bg-bg-sand" /> },
);
const PLWaterfall = dynamic(
  () => import("./PLWaterfall").then((m) => ({ default: m.PLWaterfall })),
  { ssr: false, loading: () => <div className="h-[260px] animate-pulse rounded-xl bg-bg-sand" /> },
);
const RiskReturnScatter = dynamic(
  () => import("./RiskReturnScatter").then((m) => ({ default: m.RiskReturnScatter })),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse rounded-xl bg-bg-sand" /> },
);
import { RebalanceoPanel } from "./RebalanceoPanel";
import { SyncStatusBadge } from "./SyncStatusBadge";

type Tab = "overview" | "cartera" | "plan" | "analisis" | "ingresos" | "fiscal";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Resumen" },
  { key: "cartera", label: "Cartera" },
  { key: "plan", label: "Plan de Ahorro" },
  { key: "analisis", label: "Análisis" },
  { key: "ingresos", label: "Ingresos Pasivos" },
  { key: "fiscal", label: "Fiscalidad" },
];

function YearFilter() {
  const selectedYear = usePatrimonioStore((s) => s.selectedYear);
  const setSelectedYear = usePatrimonioStore((s) => s.setSelectedYear);
  const getAvailableYears = usePatrimonioStore((s) => s.getAvailableYears);
  const years = getAvailableYears();

  const options = [
    { value: "all", label: "Total" },
    ...years.map((y) => ({ value: y, label: y })),
  ];

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

  const gainers = getTopGainers(5);
  const losers = getTopLosers(5);

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
                <p className="truncate text-sm font-medium text-foreground" title={asset.name}>{asset.name}</p>
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
                <p className="truncate text-sm font-medium text-foreground" title={asset.name}>{asset.name}</p>
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

      {/* Sync status */}
      <SyncStatusBadge />

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
          {/* Evolución chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Evolución de la cartera (sin efectivo)
            </h3>
            <EvolutionChart height={380} />
          </div>

          {/* Treemap + top performers */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
              <h3 className="mb-1 text-sm font-semibold text-foreground">Mapa de posiciones</h3>
              <p className="mb-3 text-xs text-text-tertiary">
                Tamaño = valor · color = P&L total
              </p>
              <PositionTreemap />
            </div>
            <div className="space-y-4">
              <TopPerformers />
            </div>
          </div>

          {/* IDEA-03 — Capital invertido vs Rentabilidad */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-0.5 text-sm font-semibold text-foreground">
              Capital invertido vs Rentabilidad
            </h3>
            <p className="mb-4 text-xs text-text-tertiary">
              Area apilada: capital aportado (azul) + rentabilidad acumulada (verde)
            </p>
            <CapitalVsReturnChart height={280} />
          </div>
        </div>
      )}

      {/* Tab: Cartera */}
      {activeTab === "cartera" && <TRPositionsTable />}

      {/* Tab: Plan de Ahorro */}
      {activeTab === "plan" && (
        <div className="space-y-5">
          <SavingsPlanPanel />
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Aportaciones mensuales al plan</h4>
              <YearFilter />
            </div>
            <MonthlyContributionChart transactions={transactions} assets={assets} />
          </div>
        </div>
      )}

      {/* Tab: Análisis */}
      {activeTab === "analisis" && (
        <div className="space-y-5">
          {/* F3 + F6 — Métricas avanzadas */}
          <MetricasAvanzadasPanel />

          {/* P&L Waterfall */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-1 text-sm font-semibold text-foreground">Cascada de P&amp;L</h3>
            <p className="mb-4 text-xs text-text-tertiary">Contribución de cada activo al resultado total</p>
            <PLWaterfall />
          </div>

          {/* Riesgo/Rentabilidad Scatter */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-1 text-sm font-semibold text-foreground">Riesgo vs Rentabilidad</h3>
            <p className="mb-4 text-xs text-text-tertiary">Cada punto = un activo. Tamaño = peso en cartera</p>
            <RiskReturnScatter />
          </div>

          {/* F3 — Evolución vs benchmark MSCI World */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-0.5 text-sm font-semibold text-foreground">
              Evolución vs MSCI World
            </h3>
            <p className="mb-4 text-xs text-text-tertiary">
              Benchmark: mismos flujos de capital al 8.5% anual estimado
            </p>
            <EvolutionChart height={300} showBenchmark />
          </div>

          {/* F6 — Simulador de proyección */}
          <SimuladorProyeccion />

          {/* IDEA-05 — Seguimiento del rebalanceo */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-0.5 text-sm font-semibold text-foreground">
              Seguimiento del rebalanceo
            </h3>
            <p className="mb-4 text-xs text-text-tertiary">
              Peso actual vs objetivo del plan de ahorro activo. Alerta si la desviación supera ±5 pp.
            </p>
            <RebalanceoPanel />
          </div>

          {/* Distribuciones (año) */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-tertiary">Filtra los gráficos por año</p>
            <YearFilter />
          </div>
          <TRChartsPanel />

          {/* IDEA-04 — Heatmap de retorno mensual */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-0.5 text-sm font-semibold text-foreground">
              Retorno mensual
            </h3>
            <p className="mb-4 text-xs text-text-tertiary">
              Rendimiento de la cartera (sin efectivo) por mes
            </p>
            <ReturnHeatmap />
          </div>
        </div>
      )}

      {/* Tab: Ingresos Pasivos */}
      {activeTab === "ingresos" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <YearFilter />
          </div>
          <PassiveIncomePanel />
        </div>
      )}

      {/* Tab: Fiscalidad */}
      {activeTab === "fiscal" && <FiscalidadPanel />}
    </div>
  );
}
