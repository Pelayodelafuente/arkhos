"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils/format";
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

function fmt(v: number) {
  return formatCurrency(v, "EUR");
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { percentage: number | null; loan_count: number | null } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];

  return (
    <div
      className="rounded-xl px-4 py-3 space-y-1 text-sm"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <p className="font-medium" style={{ color: "var(--text-primary)" }}>
        {item.name}
      </p>
      <p className="font-mono tabular-nums" style={{ color: "var(--platform-mintos)" }}>
        {fmt(item.value)}
      </p>
      {item.payload.percentage !== null && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {item.payload.percentage.toFixed(1)}% del total
        </p>
      )}
      {item.payload.loan_count !== null && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {item.payload.loan_count} préstamos
        </p>
      )}
    </div>
  );
}

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

  const chartData = filtered.map((item) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage,
    loan_count: item.loan_count,
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

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Donut chart */}
        <div className="flex-shrink-0">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((_, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={MINTOS_PALETTE[idx % MINTOS_PALETTE.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 w-full">
          {chartData.map((item, idx) => (
            <div key={item.name} className="flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: MINTOS_PALETTE[idx % MINTOS_PALETTE.length] }}
                aria-hidden="true"
              />
              <span className="flex-1 text-sm truncate" style={{ color: "var(--text-secondary)" }}>
                {item.name}
              </span>
              <span className="font-mono text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                {fmt(item.value)}
              </span>
              {item.percentage !== null && (
                <span className="font-mono text-xs tabular-nums w-12 text-right" style={{ color: "var(--text-muted)" }}>
                  {item.percentage.toFixed(1)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
