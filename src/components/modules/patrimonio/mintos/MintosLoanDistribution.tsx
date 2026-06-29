"use client";

import { formatEur } from "@/lib/utils/format";
import { Donut } from "@/components/viz";
import type { MintosDistribution } from "@/types/mintos";

const MINTOS_PALETTE = [
  "#C4704A",
  "#D9967A",
  "#A85A38",
  "#E8B49A",
  "#8C4A2A",
  "#F0CDB8",
  "#704030",
  "#C49078",
];

interface MintosLoanDistributionProps {
  items: MintosDistribution[];
}

export function MintosLoanDistribution({ items }: MintosLoanDistributionProps) {
  const filtered = items.filter((i) => i.amount > 0);

  if (filtered.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Sin datos de distribución. Actualiza desde Mintos → Estadísticas.
        </p>
      </div>
    );
  }

  const data = filtered.map((item, idx) => ({
    name: item.category,
    value: item.amount,
    color: MINTOS_PALETTE[idx % MINTOS_PALETTE.length],
  }));

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <h3 className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
        Distribución por Tipo de Préstamo
      </h3>

      <Donut data={data} valueFormatter={formatEur} />
    </div>
  );
}
