"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}

export const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(
  function AuthButton({ variant = "primary", loading, children, disabled, className = "", ...props }, ref) {
    const isDisabled = disabled || loading;

    const base =
      "relative h-[48px] w-full rounded-xl font-mono text-[13px] font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-copper)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-bg)] disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden";

    const variants = {
      primary:
        "text-white hover:translate-y-[-2px] hover:shadow-[0_8px_24px_rgba(212,132,90,0.3)]",
      secondary:
        "border text-[var(--auth-text)] hover:bg-[rgba(255,255,255,0.06)]",
      ghost:
        "text-[var(--auth-copper)] hover:bg-[rgba(212,132,90,0.08)]",
    };

    const variantStyle = variants[variant];

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`${base} ${variantStyle} ${className}`}
        style={{
          ...(variant === "primary"
            ? {
                background: "linear-gradient(135deg, #D4845A 0%, #A85C35 100%)",
              }
            : variant === "secondary"
              ? {
                  borderColor: "var(--auth-border)",
                  backgroundColor: "transparent",
                }
              : {
                  backgroundColor: "transparent",
                }),
        }}
        {...props}
      >
        {/* Shimmer effect for primary */}
        {variant === "primary" && !isDisabled && (
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
              animation: "auth-shimmer 3s ease-in-out 2s infinite",
            }}
          />
        )}

        {/* Content */}
        <span
          className={`relative z-10 flex items-center justify-center gap-2 ${loading ? "invisible" : ""}`}
        >
          {children}
        </span>

        {/* Loading spinner */}
        {loading && (
          <span className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </span>
        )}
      </button>
    );
  }
);
