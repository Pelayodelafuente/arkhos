"use client";

import { useMemo } from "react";
import { Treemap, Tooltip, ResponsiveContainer } from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

function getPLColor(pl: number): string {
  if (pl >= 15) return "#1B5E4A";
  if (pl >= 8) return "#2E7D6B";
  if (pl >= 3) return "#5B8C6A";
  if (pl >= 0) return "#8CAF8A";
  if (pl >= -5) return "#C4704A";
  if (pl >= -10) return "#A32D2D";
  return "#7A1515";
}

interface TreeNode {
  name: string;
  ticker: string;
  value: number;
  pl_percentage: number;
  current_value: number;
  [key: string]: string | number;
}

interface ContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  ticker?: string;
  pl_percentage?: number;
}

function CustomContent(props: ContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, ticker = "", pl_percentage = 0 } = props;
  if (width < 36 || height < 28) return null;
  const color = getPLColor(pl_percentage);
  const sign = pl_percentage >= 0 ? "+" : "";

  return (
    <g>
      <rect
        x={x + 1}
        y={y + 1}
        width={width - 2}
        height={height - 2}
        fill={color}
        stroke="var(--bg-main)"
        strokeWidth={2}
        rx={4}
      />
      {height > 42 && (
        <text
          x={x + 8}
          y={y + 18}
          fill="rgba(255,255,255,0.95)"
          fontSize={10}
          fontWeight={600}
          fontFamily="var(--font-mono)"
        >
          {ticker.length > 8 ? ticker.substring(0, 8) : ticker}
        </text>
      )}
      {height > 58 && (
        <text
          x={x + 8}
          y={y + 32}
          fill="rgba(255,255,255,0.7)"
          fontSize={9}
          fontFamily="var(--font-mono)"
        >
          {sign}
          {pl_percentage.toFixed(1)}%
        </text>
      )}
    </g>
  );
}

interface TooltipPayload {
  payload: TreeNode;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const plColor = d.pl_percentage >= 0 ? "#2E7D6B" : "#A32D2D";
  const sign = d.pl_percentage >= 0 ? "+" : "";
  return (
    <div
      className="rounded-xl border border-border px-3 py-2.5 text-xs"
      style={{ backgroundColor: "var(--bg-card)", boxShadow: "var(--shadow-modal)" }}
    >
      <p className="font-medium text-foreground">{d.name}</p>
      {d.ticker && <p className="font-mono text-text-tertiary">{d.ticker}</p>}
      <div className="mt-2 space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-text-tertiary">Valor</span>
          <span className="font-mono">{formatEur(d.current_value)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-text-tertiary">P&L total</span>
          <span className="font-mono font-medium" style={{ color: plColor }}>
            {sign}
            {d.pl_percentage.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function PositionTreemap() {
  const getTRAssets = usePatrimonioStore((s) => s.getTRAssets);
  const trAssets = getTRAssets();

  const data = useMemo(
    () =>
      trAssets
        .filter((a) => a.category !== "cash" && (a.current_value ?? 0) > 0)
        .map(
          (a): TreeNode => ({
            name: a.name,
            ticker: a.ticker ?? a.isin?.substring(0, 6) ?? "",
            value: a.current_value ?? 0,
            pl_percentage: a.pl_percentage ?? 0,
            current_value: a.current_value ?? 0,
          })
        ),
    [trAssets]
  );

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-text-tertiary">Sin posiciones</p>
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="mb-3 flex items-center gap-4">
        <span className="text-xs text-text-tertiary">P&L %:</span>
        {[
          { color: "#A32D2D", label: "< 0%" },
          { color: "#C4704A", label: "0-3%" },
          { color: "#8CAF8A", label: "3-8%" },
          { color: "#2E7D6B", label: "> 8%" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
            <span className="text-xs text-text-tertiary">{label}</span>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <Treemap
          data={data}
          dataKey="value"
          aspectRatio={4 / 3}
          stroke="transparent"
          content={<CustomContent />}
          isAnimationActive={false}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
