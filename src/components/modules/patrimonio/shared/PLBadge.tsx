"use client";

interface PLBadgeProps {
  amount: number;
  percentage: number;
  showAmount?: boolean;
  showPercentage?: boolean;
  size?: "sm" | "md";
}

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const formatPct = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

export function PLBadge({
  amount,
  percentage,
  showAmount = false,
  showPercentage = true,
  size = "sm",
}: PLBadgeProps) {
  const isPositive = amount >= 0;
  const isZero = amount === 0;

  const bg = isZero
    ? "rgba(176,122,58,0.12)"
    : isPositive
      ? "rgba(46,125,107,0.12)"
      : "rgba(163,45,45,0.12)";

  const color = isZero
    ? "#B07A3A"
    : isPositive
      ? "var(--module-patrimonio)"
      : "#A32D2D";

  const border = isZero
    ? "1px solid rgba(176,122,58,0.25)"
    : isPositive
      ? "1px solid rgba(46,125,107,0.25)"
      : "1px solid rgba(163,45,45,0.25)";

  const paddingClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  const parts: string[] = [];
  if (showAmount) parts.push(formatEur(amount));
  if (showPercentage) parts.push(formatPct(percentage));

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-mono font-medium ${paddingClass}`}
      style={{ backgroundColor: bg, color, border }}
    >
      {parts.join(" · ")}
    </span>
  );
}
