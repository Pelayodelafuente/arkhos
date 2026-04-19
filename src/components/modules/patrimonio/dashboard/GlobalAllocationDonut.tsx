"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { useIndexaStore } from "@/stores/indexa-store";
import { useHorosStore } from "@/stores/horos-store";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

interface PlatformSegment {
  name: string;
  value: number;
  color: string;
}

const PLATFORM_CONFIG: { slug: string; name: string; color: string }[] = [
  { slug: "trade-republic", name: "Trade Republic", color: "#2E7D6B" },
  { slug: "indexa", name: "Indexa Capital", color: "#3B78B0" },
  { slug: "horos", name: "Horos", color: "#7260C4" },
  { slug: "mintos", name: "Mintos", color: "#C4704A" },
  { slug: "crypto", name: "Cripto", color: "#B07A3A" },
];

interface RechartsTooltipPayload {
  name?: string;
  value?: number;
  color?: string;
}

interface RechartsTooltipProps {
  active?: boolean;
  payload?: RechartsTooltipPayload[];
}

function CustomTooltip({ active, payload }: RechartsTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div
      className="rounded-xl p-3"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      }}
    >
      <p className="text-xs text-muted-foreground mb-1">{item.name}</p>
      <p className="font-mono text-sm font-semibold text-foreground">{formatEur(item.value as number)}</p>
    </div>
  );
}

export function GlobalAllocationDonut() {
  const assets = usePatrimonioStore((s) => s.assets);
  const platforms = usePatrimonioStore((s) => s.platforms);
  const overview = usePatrimonioStore((s) => s.overview);
  const indexaOverview = useIndexaStore((s) => s.overview);
  const horosPosition = useHorosStore((s) => s.position);

  const totalValue =
    (overview?.total_value ?? 0) +
    (indexaOverview?.total_value ?? 0) +
    (horosPosition?.total_value ?? 0);

  const segments = useMemo((): PlatformSegment[] => {
    return PLATFORM_CONFIG.map((cfg) => {
      if (cfg.slug === "indexa") {
        const value = indexaOverview?.total_value ?? 0;
        return { name: cfg.name, value, color: cfg.color };
      }
      if (cfg.slug === "horos") {
        const value = horosPosition?.total_value ?? 0;
        return { name: cfg.name, value, color: cfg.color };
      }
      const platform = platforms.find((p) => p.slug === cfg.slug);
      if (!platform) return { name: cfg.name, value: 0, color: cfg.color };
      const value = assets
        .filter((a) => a.platform_id === platform.id)
        .reduce((s, a) => s + (a.current_value ?? 0), 0);
      return { name: cfg.name, value, color: cfg.color };
    }).filter((s) => s.value > 0);
  }, [assets, platforms, indexaOverview, horosPosition]);

  const hasData = segments.length > 0 && totalValue > 0;

  if (!hasData) {
    return (
      <div
        className="flex h-full min-h-[280px] items-center justify-center rounded-xl"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-sm text-muted-foreground">Sin datos de distribución</p>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-xl p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <p className="mb-4 text-sm font-medium text-foreground">Distribución por plataforma</p>

      {/* Donut */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Tooltip content={(props) => <CustomTooltip active={props.active} payload={props.payload as unknown as RechartsTooltipPayload[] | undefined} />} />
            <Pie
              data={segments}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {segments.map((seg) => (
                <Cell key={seg.name} fill={seg.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          <p className="text-xs text-muted-foreground">Portfolio</p>
          <p className="font-mono text-sm font-semibold text-foreground tabular-nums">
            {formatEur(totalValue)}
          </p>
        </div>
      </div>

      {/* Legend */}
      <ul className="mt-4 space-y-1.5">
        {segments.map((seg) => {
          const pct = totalValue > 0 ? (seg.value / totalValue) * 100 : 0;
          return (
            <li key={seg.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: seg.color }}
                  aria-hidden="true"
                />
                <span className="text-xs text-muted-foreground">{seg.name}</span>
              </div>
              <span className="font-mono text-xs text-foreground">{pct.toFixed(1)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
