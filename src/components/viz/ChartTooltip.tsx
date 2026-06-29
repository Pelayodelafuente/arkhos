import type { ReactNode } from "react";

/**
 * Tooltip unificado de gráficas (Fase 0.2 — fundación viz).
 *
 * Hoy cada gráfica define su propio tooltip; esto centraliza el "marco"
 * (fondo card, borde stone, sombra, tipografía mono tabular) y un render
 * genérico de filas `nombre → valor` compatible con el `content` de Recharts.
 *
 * Uso típico (función para evitar choques de tipos con Recharts):
 *   <Tooltip content={(props) => (
 *     <ChartTooltip
 *       {...(props as unknown as ChartTooltipProps)}
 *       valueFormatter={(v) => formatEur(v)}
 *     />
 *   )} />
 *
 * Para tooltips a medida, usar `ChartTooltipFrame` como contenedor.
 */

export function ChartTooltipFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-[0_4px_20px_rgba(0,0,0,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

/** Fila tal y como la entrega Recharts en `payload`. */
export interface ChartTooltipRow {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly ChartTooltipRow[];
  label?: unknown;
  /** Oculta la etiqueta (p.ej. en pies/donuts donde el nombre va en cada fila). */
  hideLabel?: boolean;
  labelFormatter?: (label: unknown) => ReactNode;
  nameFormatter?: (name: string, row: ChartTooltipRow) => ReactNode;
  valueFormatter?: (value: number, row: ChartTooltipRow) => ReactNode;
}

export function ChartTooltip({
  active,
  payload,
  label,
  hideLabel = false,
  labelFormatter,
  nameFormatter,
  valueFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const showLabel = !hideLabel && label != null && label !== "";

  return (
    <ChartTooltipFrame>
      {showLabel && (
        <p className="mb-1.5 font-medium text-text-secondary">
          {labelFormatter ? labelFormatter(label) : String(label)}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((row, i) => {
          const rawName = row.name ?? String(row.dataKey ?? "");
          const displayName = nameFormatter ? nameFormatter(rawName, row) : rawName;
          const displayValue =
            typeof row.value === "number" && valueFormatter
              ? valueFormatter(row.value, row)
              : row.value;
          return (
            <div
              key={`${rawName}-${i}`}
              className="flex items-center justify-between gap-4"
            >
              <span
                className="text-text-tertiary"
                style={row.color ? { color: row.color } : undefined}
              >
                {displayName}
              </span>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {displayValue}
              </span>
            </div>
          );
        })}
      </div>
    </ChartTooltipFrame>
  );
}
