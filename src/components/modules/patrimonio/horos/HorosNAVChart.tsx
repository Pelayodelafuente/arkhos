"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

const HOROS_COLOR = "#7260C4";
const GRANATE = "#8B1A2E";

const fmtNav = (v: number) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v);

interface NAVPoint {
  date: string;
  nav: number;
  avgNav: number | null;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: NAVPoint; value: number; color: string; name: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const navEntry = payload[0];
  const avgEntry = payload.find((p) => p.name === "avgNav");
  const nav = navEntry?.value ?? 0;
  const avg = avgEntry?.value ?? payload[0]?.payload?.avgNav ?? 0;
  const diffPct = avg > 0 ? ((nav - avg) / avg) * 100 : 0;

  return (
    <div
      className="rounded-xl p-3 text-xs"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        minWidth: 160,
      }}
    >
      <p className="font-medium mb-1.5 text-foreground">{label}</p>
      <div className="space-y-1 font-mono">
        <div className="flex justify-between gap-4">
          <span style={{ color: "var(--text-muted)" }}>VL</span>
          <span style={{ color: HOROS_COLOR }}>{fmtNav(nav)}€</span>
        </div>
        {avg > 0 && (
          <div className="flex justify-between gap-4">
            <span style={{ color: "var(--text-muted)" }}>vs precio medio</span>
            <span style={{ color: diffPct >= 0 ? "var(--platform-tr, #2E7D6B)" : GRANATE }}>
              {diffPct >= 0 ? "+" : ""}{diffPct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface HorosNAVChartProps {
  data: NAVPoint[];
  avgNav: number | null;
}

export function HorosNAVChart({ data, avgNav }: HorosNAVChartProps) {
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
          <h3 className="font-heading text-sm text-foreground">Evolución del VL</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Valor liquidativo histórico
          </p>
        </div>
        {avgNav && (
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span
              className="h-0.5 w-4 rounded"
              style={{ border: `1px dashed ${GRANATE}` }}
            />
            <span style={{ color: "var(--text-muted)" }}>VL medio {fmtNav(avgNav)}€</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-stone, rgba(160,120,80,0.15))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--text-muted, #888780)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--text-muted, #888780)" }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `${v.toFixed(0)}`}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          {avgNav && (
            <ReferenceLine
              y={avgNav}
              stroke={GRANATE}
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
          )}
          <Line
            type="monotone"
            dataKey="nav"
            stroke={HOROS_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: HOROS_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: HOROS_COLOR }}
            name="nav"
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-center" style={{ color: "var(--text-muted)" }}>
        Fuente: Horos AM · Actualización manual
      </p>
    </div>
  );
}
