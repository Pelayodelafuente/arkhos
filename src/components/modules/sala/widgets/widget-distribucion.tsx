"use client";

// Distribución de cartera por categoría — selector del store de Patrimonio

import { useMemo } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { MODULE_HEX } from "@/lib/sala/palette";
import { fmtEur } from "@/lib/sala/format";
import { WidgetShell } from "./widget-shell";
import { SALA_TOOLTIP_STYLE, type SalaWidgetProps } from "./types";

export function WidgetDistribucion({ width, height }: SalaWidgetProps) {
  const getAllocationByCategory = usePatrimonioStore((s) => s.getAllocationByCategory);
  const assets = usePatrimonioStore((s) => s.assets);
  // Patrón reactivo seguro: el selector devuelve la función estable y el
  // array se memoiza sobre el estado subyacente (evita loop de getSnapshot)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const slices = useMemo(() => getAllocationByCategory(), [assets, getAllocationByCategory]);
  const donutSize = Math.min(height, Math.floor(width * 0.45));

  if (slices.length === 0) {
    return (
      <WidgetShell title="Patrimonio · Distribución" accent={MODULE_HEX.patrimonio}>
        <p className="pt-4 font-mono text-[10px] text-[var(--sala-text-dim)]">SIN POSICIONES</p>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title="Patrimonio · Distribución" accent={MODULE_HEX.patrimonio}>
      <div className="flex h-full items-center gap-3">
        <PieChart width={donutSize} height={donutSize}>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius={donutSize * 0.3}
            outerRadius={donutSize * 0.46}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {slices.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            isAnimationActive={false}
            contentStyle={SALA_TOOLTIP_STYLE}
            formatter={(value) => fmtEur(Number(value))}
          />
        </PieChart>
        <ul className="min-w-0 flex-1 space-y-1 overflow-hidden">
          {slices.slice(0, 6).map((slice) => (
            <li key={slice.name} className="flex items-center gap-2 font-mono text-[10px]">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="truncate text-[var(--sala-text-dim)]">{slice.name}</span>
              <span className="ml-auto text-[var(--sala-text)]">
                {slice.percentage.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </WidgetShell>
  );
}
