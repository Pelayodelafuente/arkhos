"use client";

// ══════════════════════════════════════
// Arkhos OPS — fallback 2D "flat ops"
// Sin WebGL fiable o en viewport pequeño: los mismos widgets del muro,
// con los mismos datos reales, en una parrilla FUI oscura desplazable.
// ══════════════════════════════════════

import { useEffect, useState } from "react";
import { SALA_SLOTS } from "@/lib/sala/config";
import { useSalaStore } from "@/stores/sala-store";
import { SALA_WIDGETS } from "./widgets/registry";

const PAGE_PADDING = 16;
const GAP = 12;
const CELL_H = 260;
/** Padding interior + header del shell del widget (px) */
const CONTENT_PADDING = 24;
const HEADER_PX = 30;

export function SalaFallback() {
  const assignments = useSalaStore((s) => s.assignments);
  const hydrateLayout = useSalaStore((s) => s.hydrateLayout);
  const [colWidth, setColWidth] = useState(0);
  const [cols, setCols] = useState(1);

  useEffect(() => {
    hydrateLayout();
  }, [hydrateLayout]);

  useEffect(() => {
    const measure = () => {
      const vw = window.innerWidth;
      const nextCols = vw >= 1024 ? 3 : vw >= 700 ? 2 : 1;
      setCols(nextCols);
      setColWidth(Math.floor((vw - PAGE_PADDING * 2 - GAP * (nextCols - 1)) / nextCols));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  if (colWidth === 0) return null;

  return (
    <div className="h-full w-full overflow-y-auto" style={{ padding: PAGE_PADDING }}>
      <header className="mb-4 flex items-baseline gap-3 pt-1">
        <h1 className="font-heading text-xl text-[var(--sala-copper)]">
          ARKHOS <span className="text-[var(--sala-text-dim)]">OPS</span>
        </h1>
        <span className="font-mono text-[9px] tracking-[0.35em] text-[var(--sala-text-dim)]">
          MODO PLANO
        </span>
      </header>
      <div
        className="grid pb-20"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: GAP }}
      >
        {SALA_SLOTS.map((slot) => {
          const meta = SALA_WIDGETS[assignments[slot.id]];
          const Widget = meta.Component;
          return (
            <div key={slot.id} style={{ height: CELL_H }}>
              <Widget
                width={colWidth - CONTENT_PADDING}
                height={CELL_H - HEADER_PX - CONTENT_PADDING}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
