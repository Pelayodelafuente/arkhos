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
  // Guard against NaN/Infinity from division-by-zero or data artifacts
  const safeAmount = isFinite(amount) && !isNaN(amount) ? amount : 0;
  const safePct = isFinite(percentage) && !isNaN(percentage) ? percentage : 0;

  const isPositive = safeAmount >= 0;
  const isZero = safeAmount === 0;

  const bg = isZero
    ? "var(--color-neutral-subtle)"
    : isPositive
      ? "var(--color-gain-subtle)"
      : "var(--color-loss-subtle)";

  const color = isZero
    ? "var(--color-neutral-fin)"
    : isPositive
      ? "var(--color-gain)"
      : "var(--color-loss)";

  const border = isZero
    ? "1px solid var(--color-neutral-border)"
    : isPositive
      ? "1px solid var(--color-gain-border)"
      : "1px solid var(--color-loss-border)";

  const paddingClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  const parts: string[] = [];
  if (showAmount) parts.push(formatEur(safeAmount));
  if (showPercentage) parts.push(formatPct(safePct));

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-mono font-medium ${paddingClass}`}
      style={{ backgroundColor: bg, color, border }}
    >
      {parts.join(" · ")}
    </span>
  );
}
