"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

interface DistributionItem {
  name: string;
  value: number;
  pct: number;
  color: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DistributionItem }>;
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
      }}
    >
      <p className="font-medium mb-1 text-foreground">{d.name}</p>
      <div className="font-mono space-y-0.5">
        <div style={{ color: d.color }}>{d.pct.toFixed(1)}%</div>
        <div style={{ color: "var(--text-muted)" }}>{fmt(d.value)}</div>
      </div>
    </div>
  );
}

interface HorosGeoDonutProps {
  data: DistributionItem[];
}

export function HorosGeoDonut({ data }: HorosGeoDonutProps) {
  if (data.length === 0) return null;

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
        Zona Euro domina la cartera (48,5%)
      </p>

      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={65}
                dataKey="value"
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.name === "Liquidez" ? "#AAA8A5" : entry.color}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-medium text-center leading-tight" style={{ color: "var(--text-muted)" }}>
              Global<br />Value
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: d.name === "Liquidez" ? "#AAA8A5" : d.color }}
                />
                <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                  {d.name}
                </span>
              </div>
              <span className="font-mono text-xs flex-shrink-0" style={{ color: "var(--text-primary)" }}>
                {d.pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
