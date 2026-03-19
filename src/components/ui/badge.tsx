import { type HTMLAttributes } from "react";

export type BadgeVariant =
  | "terracotta"
  | "green"
  | "blue"
  | "gold"
  | "gray"
  | "sage";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  terracotta: { bg: "rgba(138,172,126,0.12)", text: "#8AAC7E" },
  green:      { bg: "rgba(138,172,126,0.15)", text: "#8AAC7E" },
  blue:       { bg: "rgba(122,172,204,0.12)", text: "#7AACCC" },
  gold:       { bg: "rgba(201,169,110,0.15)", text: "#C9A96E" },
  gray:       { bg: "rgba(107,111,98,0.15)", text: "#6B6F62" },
  sage:       { bg: "rgba(138,172,126,0.12)", text: "#8AAC7E" },
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
