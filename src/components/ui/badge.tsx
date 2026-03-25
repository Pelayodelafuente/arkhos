import { type HTMLAttributes } from "react";

export type BadgeVariant =
  | "terracotta"
  | "green"
  | "blue"
  | "gold"
  | "gray";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
  terracotta: { bg: "rgba(196,112,74,0.12)", text: "#c4704a" },
  green:      { bg: "rgba(5,107,99,0.10)", text: "#045950", border: "rgba(5,107,99,0.25)" },
  blue:       { bg: "rgba(95,27,41,0.08)", text: "#5f1b29", border: "rgba(95,27,41,0.20)" },
  gold:       { bg: "rgba(154,106,40,0.12)", text: "#9a6a28" },
  gray:       { bg: "var(--bg-sand)", text: "var(--text-muted)", border: "var(--border-subtle)" },
};

export function Badge({
  variant = "gray",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const { bg, text, border } = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      style={{
        backgroundColor: bg,
        color: text,
        ...(border ? { border: `1px solid ${border}` } : {}),
      }}
      {...props}
    >
      {children}
    </span>
  );
}
