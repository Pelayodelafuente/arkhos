"use client";

import { useState } from "react";
import type { AllocationSlice } from "@/types/patrimonio";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

interface AllocationBarsProps {
  data: AllocationSlice[];
  title?: string;
}

export function AllocationBars({ data, title }: AllocationBarsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-sm text-text-tertiary">Sin datos</p>
      </div>
    );
  }

  return (
    <div>
      {title && <p className="mb-3 text-sm font-medium text-text-secondary">{title}</p>}
      <div className="space-y-3">
        {data.map((item, i) => {
          const isHovered = hoveredIndex === i;
          const dimmed = hoveredIndex !== null && !isHovered;
          return (
            <div
              key={item.name}
              className="transition-opacity"
              style={{ opacity: dimmed ? 0.45 : 1 }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-xs text-text-secondary">{item.name}</span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <span className="font-mono text-xs text-text-tertiary">
                    {formatEur(item.value)}
                  </span>
                  <span className="w-10 text-right font-mono text-xs font-semibold text-foreground">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full"
                style={{ backgroundColor: "var(--bg-sand)" }}
              >
                <div
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
