"use client";

import { Sparkles } from "lucide-react";
import { TROverview } from "./TROverview";
import { SavingsPlanPanel } from "./SavingsPlanPanel";
import { TRChartsPanel } from "./TRChartsPanel";
import { TRPositionsTable } from "./TRPositionsTable";
import { PassiveIncomePanel } from "./PassiveIncomePanel";

export function TRDashboard() {
  return (
    <div className="space-y-6">
      {/* 2-column layout on desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TROverview />
        <SavingsPlanPanel />
      </div>

      {/* Charts panel — 2x2 grid */}
      <TRChartsPanel />

      {/* Positions table */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-text-secondary">Posiciones</h3>
        <TRPositionsTable />
      </div>

      {/* Passive income */}
      <PassiveIncomePanel />

      {/* AI placeholder */}
      <div
        className="rounded-xl border border-border bg-card p-6"
        style={{ borderStyle: "dashed" }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: "rgba(114,96,196,0.12)",
              border: "1px solid rgba(114,96,196,0.25)",
            }}
          >
            <Sparkles size={18} strokeWidth={1.75} style={{ color: "#7260C4" }} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Analisis IA de tu cartera</p>
            <p className="mt-0.5 text-xs text-text-tertiary">Proximamente</p>
            <p className="mt-2 max-w-lg text-sm text-text-secondary">
              Claude analizara tu portfolio y te dara sugerencias personalizadas sobre
              diversificacion, riesgo y oportunidades de mejora.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
