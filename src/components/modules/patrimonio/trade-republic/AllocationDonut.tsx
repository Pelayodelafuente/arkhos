"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { AllocationSlice } from "@/types/patrimonio";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

interface AllocationDonutProps {
  data: AllocationSlice[];
  title: string;
  totalLabel?: string;
}

export function AllocationDonut({ data, title, totalLabel }: AllocationDonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const active = activeIndex !== null ? data[activeIndex] : null;

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center text-center">
        <p className="text-sm text-text-tertiary">Sin datos de asignación</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-text-secondary">{title}</p>
      <div className="relative">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  strokeWidth={0}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                  style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Central label — shows hovered segment or total */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          {active ? (
            <>
              <span className="max-w-[90px] truncate text-center font-mono text-[10px] text-text-tertiary">
                {active.name}
              </span>
              <span className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                {active.percentage.toFixed(1)}%
              </span>
              <span className="font-mono text-[10px] text-text-tertiary">
                {formatEur(active.value)}
              </span>
            </>
          ) : (
            <>
              <span className="font-mono text-xs text-text-tertiary">{totalLabel ?? "Total"}</span>
              <span className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                {formatEur(total)}
              </span>
            </>
          )}
        </div>
      </div>
      {/* Legend */}
      <div className="mt-3 space-y-1.5">
        {data.map((item, i) => (
          <div
            key={item.name}
            className="flex items-center justify-between gap-2 transition-opacity"
            style={{ opacity: activeIndex === null || activeIndex === i ? 1 : 0.45 }}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="truncate text-xs text-text-secondary">{item.name}</span>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <span className="font-mono text-xs text-text-tertiary">
                {formatEur(item.value)}
              </span>
              <span className="w-9 text-right font-mono text-xs text-text-tertiary">
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
