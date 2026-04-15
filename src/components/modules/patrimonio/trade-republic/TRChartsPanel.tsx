"use client";

import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { TRPLBarChart } from "./TRPLBarChart";
import { MonthlyContributionChart } from "./MonthlyContributionChart";
import { AllocationBars } from "./AllocationBars";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h4 className="mb-4 text-sm font-semibold text-foreground">{title}</h4>
      {children}
    </div>
  );
}

export function TRChartsPanel() {
  const getAllocationByCategory = usePatrimonioStore((s) => s.getAllocationByCategory);
  const getAllocationByGeography = usePatrimonioStore((s) => s.getAllocationByGeography);
  const getAllocationByRisk = usePatrimonioStore((s) => s.getAllocationByRisk);
  const getAllocationByCurrency = usePatrimonioStore((s) => s.getAllocationByCurrency);
  const getAllocationBySector = usePatrimonioStore((s) => s.getAllocationBySector);
  const transactions = usePatrimonioStore((s) => s.transactions);
  const assets = usePatrimonioStore((s) => s.assets);

  const categoryData = getAllocationByCategory();
  const geoData = getAllocationByGeography();
  const riskData = getAllocationByRisk();
  const currencyData = getAllocationByCurrency();
  const sectorData = getAllocationBySector();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="P&L por posición">
        <TRPLBarChart />
      </ChartCard>

      <ChartCard title="Distribución por categoría">
        <AllocationBars data={categoryData} title="Por tipo de activo" />
      </ChartCard>

      <ChartCard title="Distribución geográfica">
        <AllocationBars data={geoData} title="Por región" />
      </ChartCard>

      <ChartCard title="Distribución sectorial">
        <AllocationBars data={sectorData} title="Por sector" />
      </ChartCard>

      <ChartCard title="Exposición a divisa">
        <AllocationBars data={currencyData} title="Por moneda (valor actual)" />
      </ChartCard>

      <ChartCard title="Distribución por nivel de riesgo">
        <AllocationBars data={riskData} title="Por perfil de riesgo" />
      </ChartCard>

      <ChartCard title="Aportaciones mensuales al plan">
        <MonthlyContributionChart transactions={transactions} assets={assets} />
      </ChartCard>
    </div>
  );
}
