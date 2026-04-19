"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { HorosDCAPoint } from "@/types/horos";

const HOROS_COLOR = "#7260C4";
const GRANATE = "#8B1A2E";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const fmtNav = (v: number) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v);

const fmtShares = (v: number) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: 6, maximumFractionDigits: 6 }).format(v);

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: HorosDCAPoint }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-xl p-3 text-xs"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        minWidth: 170,
      }}
    >
      <p className="font-medium mb-1.5 text-foreground">{d.label}</p>
      <div className="space-y-1 font-mono">
        <div className="flex justify-between gap-4">
          <span style={{ color: "var(--text-muted)" }}>Importe</span>
          <span>{fmt(d.amount)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: "var(--text-muted)" }}>VL pagado</span>
          <span style={{ color: HOROS_COLOR }}>{fmtNav(d.nav_applied)}€</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: "var(--text-muted)" }}>Participaciones</span>
          <span>{fmtShares(d.shares)}</span>
        </div>
      </div>
    </div>
  );
}

interface HorosDCAChartProps {
  data: HorosDCAPoint[];
  currentNav: number;
  avgNav: number;
}

export function HorosDCAChart({ data, currentNav, avgNav }: HorosDCAChartProps) {
  if (data.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-sm text-foreground">Coste por compra (DCA)</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            VL pagado en cada suscripción
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="h-0.5 w-4 rounded" style={{ backgroundColor: HOROS_COLOR }} />
            <span style={{ color: "var(--text-muted)" }}>VL actual {fmtNav(currentNav)}€</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="h-0.5 w-4 rounded border-dashed border-t border-stone-400" style={{ borderTop: "2px dashed #888" }} />
            <span style={{ color: "var(--text-muted)" }}>Precio medio {fmtNav(avgNav)}€</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-stone, rgba(160,120,80,0.15))" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--text-muted, #888780)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--text-muted, #888780)" }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `${v.toFixed(0)}€`}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={currentNav}
            stroke={HOROS_COLOR}
            strokeWidth={2}
            label={{
              value: `VL actual ${currentNav.toFixed(0)}€`,  // toFixed(0) OK here — chart label, not VL display
              position: "insideTopRight",
              fontSize: 9,
              fill: HOROS_COLOR,
            }}
          />
          <ReferenceLine
            y={avgNav}
            stroke="#888"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
          <Bar dataKey="nav_applied" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((entry) => (
              <Cell
                key={entry.date}
                fill={entry.nav_applied < avgNav ? GRANATE : `color-mix(in srgb, ${HOROS_COLOR} 75%, transparent)`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
