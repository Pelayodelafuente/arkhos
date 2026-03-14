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

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  terracotta: { bg: "rgba(196,112,74,0.12)", text: "#C4704A" },
  green:      { bg: "rgba(91,140,106,0.12)", text: "#5B8C6A" },
  blue:       { bg: "rgba(74,122,155,0.12)", text: "#4A7A9B" },
  gold:       { bg: "rgba(155,122,74,0.12)", text: "#9B7A4A" },
  gray:       { bg: "rgba(136,135,128,0.12)", text: "#888780" },
};

export function Badge({
  variant = "gray",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const { bg, text } = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      style={{ backgroundColor: bg, color: text }}
      {...props}
    >
      {children}
    </span>
  );
}
