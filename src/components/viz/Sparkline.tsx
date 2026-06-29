/**
 * Sparkline SVG unificada (Fase 0.2 — fundación viz).
 *
 * Sustituye a las ≥3 mini-gráficas SVG duplicadas (GlobalKPIs, OverviewKPIs,
 * PatrimonioHero, etc.). Una sola implementación, sin dependencias,
 * con modo línea o área. Sin hooks → compatible con Server Components.
 *
 * Misma matemática de normalización que las versiones previas (min/max con
 * padding vertical), por lo que la representación es equivalente.
 */
interface SparklineProps {
  values: number[];
  /** Color de trazo (acepta CSS vars, p.ej. "var(--platform-tr)"). */
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  /** "line" (por defecto) o "area" con relleno tenue del color. */
  mode?: "line" | "area";
  /** Opacidad del trazo (las versiones previas usaban 0.7–0.8). */
  opacity?: number;
  className?: string;
  /** Si se pasa, el SVG es accesible con ese label; si no, queda `aria-hidden`. */
  ariaLabel?: string;
}

export function Sparkline({
  values,
  color = "var(--accent-terracotta)",
  width = 60,
  height = 24,
  strokeWidth = 1.5,
  mode = "line",
  opacity = 1,
  className,
  ariaLabel,
}: SparklineProps) {
  if (!values || values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 2;

  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - pad * 2) - pad;
    return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const;
  });

  const linePoints = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPath =
    mode === "area"
      ? `M ${coords[0][0]},${height} ` +
        coords.map(([x, y]) => `L ${x},${y}`).join(" ") +
        ` L ${coords[coords.length - 1][0]},${height} Z`
      : null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ opacity }}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {areaPath && (
        <path d={areaPath} fill={color} fillOpacity={0.12} stroke="none" />
      )}
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
