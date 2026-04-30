"use client";

import type { CorrelationMatrix } from "@/lib/mercados/portfolio-market";

interface Props {
  data: CorrelationMatrix | undefined;
  isLoading: boolean;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-xl border border-border bg-card animate-pulse ${className}`} />;
}

function corrToColor(value: number): string {
  // -1 → blue, 0 → light gray, 1 → red
  if (value >= 0) {
    const intensity = Math.round(value * 255);
    return `rgb(${intensity + (255 - intensity)}, ${255 - intensity * 0.6}, ${255 - intensity * 0.6})`;
  } else {
    const intensity = Math.round(Math.abs(value) * 255);
    return `rgb(${255 - intensity * 0.6}, ${255 - intensity * 0.6}, ${intensity + (255 - intensity)})`;
  }
}

function corrToTextColor(value: number): string {
  return Math.abs(value) > 0.6 ? "#fff" : "var(--color-foreground)";
}

export function CorrelationHeatmap({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return <Skeleton className="h-64" />;
  }

  const { assets, matrix, interpretation } = data;

  if (assets.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-text-tertiary">Sin datos de correlación disponibles.</p>
      </div>
    );
  }

  const cellSize = Math.min(64, Math.floor(560 / (assets.length + 1)));

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
        Matriz de correlaciones (6 meses)
      </p>

      <div className="overflow-x-auto">
        <table className="border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ width: cellSize, minWidth: cellSize }} />
              {assets.map(asset => (
                <th
                  key={asset}
                  className="px-1 pb-2 text-center font-medium text-text-tertiary"
                  style={{ width: cellSize, minWidth: cellSize }}
                >
                  {asset}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map((rowAsset, i) => (
              <tr key={rowAsset}>
                <td className="pr-2 text-right font-medium text-text-tertiary whitespace-nowrap">
                  {rowAsset}
                </td>
                {assets.map((_, j) => {
                  const val = matrix[i]?.[j] ?? 0;
                  return (
                    <td
                      key={j}
                      className="text-center font-mono tabular-nums"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: corrToColor(val),
                        color: corrToTextColor(val),
                        border: "1px solid var(--color-border)",
                        borderRadius: 4,
                        padding: 2,
                      }}
                    >
                      {val.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-3 text-[10px] text-text-tertiary">
        <div className="flex items-center gap-1">
          <div className="h-3 w-6 rounded" style={{ background: "rgb(120,160,255)" }} />
          <span>−1 correlación inversa</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-6 rounded bg-gray-200" />
          <span>0 sin correlación</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-6 rounded" style={{ background: "rgb(255,120,120)" }} />
          <span>+1 correlación perfecta</span>
        </div>
      </div>

      {interpretation && (
        <div className="rounded-lg border border-border bg-sand p-3 text-[11px] text-text-secondary leading-relaxed border-t border-border pt-3">
          <span className="font-medium">Análisis: </span>
          {interpretation}
        </div>
      )}
    </div>
  );
}
