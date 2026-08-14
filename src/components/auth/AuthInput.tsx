"use client";

import { type LucideIcon } from "lucide-react";
import { type InputHTMLAttributes, type ReactNode, forwardRef } from "react";

interface AuthInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: string;
  icon: LucideIcon;
  error?: string;
  rightElement?: ReactNode;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  function AuthInput({ label, icon: Icon, error, rightElement, id, ...props }, ref) {
    return (
      <div className="relative">
        {/* Icon */}
        <Icon
          size={18}
          strokeWidth={1.5}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
          style={{ color: "var(--text-tertiary)" }}
        />

        {/* Input */}
        <input
          ref={ref}
          id={id}
          placeholder=" "
          className={`peer h-[48px] w-full rounded-xl border pl-10 text-[14px] outline-none transition-all duration-200 focus:shadow-[0_0_0_3px_var(--auth-copper-glow)] ${rightElement ? "pr-11" : "pr-4"}`}
          style={{
            color: "var(--text-primary)",
            backgroundColor: "color-mix(in srgb, var(--bg-sand) 55%, transparent)",
            borderColor: error ? "var(--error)" : "var(--border-stone)",
            caretColor: "var(--auth-copper)",
            animation: error ? "auth-shake 0.4s ease-out" : undefined,
            paddingTop: 20,
            paddingBottom: 4,
          }}
          {...props}
        />

        {/* Floating label */}
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-10 text-[13px] leading-none transition-all duration-200 peer-focus:top-[6px] peer-focus:text-[9px] peer-focus:opacity-70 peer-[&:not(:placeholder-shown)]:top-[6px] peer-[&:not(:placeholder-shown)]:text-[9px] peer-[&:not(:placeholder-shown)]:opacity-70"
          style={{
            color: "var(--text-tertiary)",
            top: 17,
          }}
        >
          {label}
        </label>

        {/* Right element (e.g. eye toggle) */}
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="mt-1.5 text-[12px]" style={{ color: "var(--error-text)" }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);
