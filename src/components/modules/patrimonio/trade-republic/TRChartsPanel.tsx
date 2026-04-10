"use client";

import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { AllocationDonut } from "./AllocationDonut";
import { TRPLBarChart } from "./TRPLBarChart";
import { EvolutionChart } from "./EvolutionChart";

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

  const categoryData = getAllocationByCategory();
  const geoData = getAllocationByGeography();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Evolucion del patrimonio">
        <EvolutionChart />
      </ChartCard>

      <ChartCard title="P&L por posicion">
        <TRPLBarChart />
      </ChartCard>

      <ChartCard title="Distribucion por categoria">
        <AllocationDonut data={categoryData} title="Por categoria" totalLabel="Cartera" />
      </ChartCard>

      <ChartCard title="Distribucion geografica">
        <AllocationDonut data={geoData} title="Por region" totalLabel="Cartera" />
      </ChartCard>
    </div>
  );
}
