import { type ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-[#0F110E] font-display font-bold tracking-[0.12em] hover:opacity-90 disabled:opacity-50",
  secondary:
    "border border-border-2 text-text-secondary bg-surface hover:border-sage-dim hover:text-foreground disabled:opacity-50",
  ghost:
    "text-text-secondary hover:bg-surface-2 hover:text-foreground disabled:opacity-50",
  danger:
    "bg-red-900/60 text-red-400 hover:bg-red-900/80 disabled:opacity-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 focus:outline-none disabled:cursor-not-allowed hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:hover:translate-y-0 disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
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
