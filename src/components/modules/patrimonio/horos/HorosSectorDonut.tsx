"use client";

import { formatEur } from "@/lib/utils/format";
import { Donut } from "@/components/viz";

interface DistributionItem {
  name: string;
  value: number;
  pct: number;
  color: string;
}

interface HorosSectorDonutProps {
  data: DistributionItem[];
}

export function HorosSectorDonut({ data }: HorosSectorDonutProps) {
  if (data.length === 0) return null;

  const donutData = data.map((d) => ({ name: d.name, value: d.value, color: d.color }));

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <h3 className="font-heading text-sm text-foreground mb-1">Distribución sectorial</h3>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        Exposición por sector del fondo
      </p>

      <Donut data={donutData} valueFormatter={formatEur} />
    </div>
  );
}
