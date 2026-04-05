import { type ButtonHTMLAttributes, forwardRef } from "react";
import type React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "btn-shimmer bg-accent text-white font-semibold hover:bg-[var(--accent-dark)] disabled:opacity-50",
  secondary:
    "border text-text-secondary bg-card hover:border-accent hover:text-accent disabled:opacity-50",
  ghost:
    "text-text-secondary hover:bg-sand hover:text-foreground disabled:opacity-50",
  danger:
    "border text-[var(--error-text)] disabled:opacity-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

const variantStyles: Partial<Record<ButtonVariant, React.CSSProperties>> = {
  secondary: { borderColor: "var(--border-stone)" },
  ghost: { borderColor: "transparent" },
  danger: {
    backgroundColor: "var(--error-bg)",
    borderColor: "var(--error-border)",
    color: "var(--error-text)",
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      style,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus:outline-none disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:hover:translate-y-0 disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        style={{ ...variantStyles[variant], ...style }}
        {...props}
      >
        {loading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
