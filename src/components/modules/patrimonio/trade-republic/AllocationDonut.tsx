"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { AllocationSlice } from "@/types/patrimonio";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

interface AllocationDonutProps {
  data: AllocationSlice[];
  title: string;
  totalLabel?: string;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: AllocationSlice;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const slice = item.payload;
  return (
    <div
      className="rounded-xl border border-border bg-card px-3 py-2 text-xs"
      style={{ boxShadow: "var(--shadow-modal)" }}
    >
      <p className="font-medium text-foreground">{slice.name}</p>
      <p className="mt-1 font-mono text-text-secondary">{formatEur(slice.value)}</p>
      <p className="font-mono text-text-tertiary">{slice.percentage.toFixed(1)}% de cartera</p>
    </div>
  );
}

export function AllocationDonut({ data, title, totalLabel }: AllocationDonutProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center text-center">
        <p className="text-sm text-text-tertiary">Sin datos de asignacion</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-text-secondary">{title}</p>
      <div className="relative">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Central label */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          <span className="font-mono text-xs text-text-tertiary">{totalLabel ?? "Total"}</span>
          <span className="mt-0.5 font-mono text-sm font-semibold text-foreground">
            {formatEur(total)}
          </span>
        </div>
      </div>
      {/* Legend */}
      <div className="mt-2 space-y-1.5">
        {data.slice(0, 6).map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="truncate text-xs text-text-secondary">{item.name}</span>
            </div>
            <span className="flex-shrink-0 font-mono text-xs text-text-tertiary">
              {item.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
