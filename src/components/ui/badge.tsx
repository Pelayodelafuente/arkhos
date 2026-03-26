import { type HTMLAttributes } from "react";

export type BadgeVariant =
  | "terracotta"
  | "green"
  | "blue"
  | "gold"
  | "gray"
  | "notas";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
  terracotta: { bg: "var(--accent-glow)",  text: "var(--accent-text)",  border: "rgba(196,112,74,0.25)" },
  green:      { bg: "var(--success-bg)",   text: "var(--success)",      border: "var(--success-border)" },
  blue:       { bg: "var(--error-bg)",     text: "var(--error)",        border: "rgba(138,48,64,0.22)" },
  gold:       { bg: "var(--warning-bg)",   text: "var(--warning)",      border: "rgba(154,106,40,0.22)" },
  gray:       { bg: "var(--bg-sand)",      text: "var(--text-muted)",   border: "var(--border-subtle)" },
  notas:      { bg: "rgba(122,155,118,0.10)", text: "var(--module-notas)", border: "rgba(122,155,118,0.22)" },
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium font-mono ${className}`}
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
