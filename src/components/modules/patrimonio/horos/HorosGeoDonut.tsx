"use client";

import { formatEur } from "@/lib/utils/format";
import { Donut } from "@/components/viz";

interface DistributionItem {
  name: string;
  value: number;
  pct: number;
  color: string;
}

interface HorosGeoDonutProps {
  data: DistributionItem[];
}

export function HorosGeoDonut({ data }: HorosGeoDonutProps) {
  if (data.length === 0) return null;

  // Subtítulo derivado del dato real (antes estaba hardcodeado).
  const top = [...data].sort((a, b) => b.value - a.value)[0];

  const donutData = data.map((d) => ({
    name: d.name,
    value: d.value,
    color: d.name === "Liquidez" ? "#AAA8A5" : d.color,
  }));

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <h3 className="font-heading text-sm text-foreground mb-1">Distribución geográfica</h3>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        {top.name} domina la cartera ({top.pct.toFixed(1).replace(".", ",")}%)
      </p>

      <Donut data={donutData} valueFormatter={formatEur} />
    </div>
  );
}
