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
          className={`peer h-[48px] w-full rounded-xl border bg-transparent pl-10 text-[14px] outline-none transition-all duration-200 ${rightElement ? "pr-11" : "pr-4"}`}
          style={{
            color: "var(--text-primary)",
            borderColor: error ? "#DC2626" : "var(--border-stone)",
            caretColor: "var(--auth-copper)",
            animation: error ? "auth-shake 0.4s ease-out" : undefined,
            paddingTop: 18,
            paddingBottom: 4,
          }}
          {...props}
        />

        {/* Floating label */}
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-10 text-[13px] transition-all duration-200 peer-focus:top-[4px] peer-focus:text-[9px] peer-focus:opacity-70 peer-[&:not(:placeholder-shown)]:top-[4px] peer-[&:not(:placeholder-shown)]:text-[9px] peer-[&:not(:placeholder-shown)]:opacity-70"
          style={{
            color: "var(--text-tertiary)",
            top: 15,
          }}
        >
          {label}
        </label>

        {/* Bottom accent line */}
        <span
          className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full transition-all duration-300 peer-focus:w-full"
          style={{
            backgroundColor: error ? "#DC2626" : "var(--auth-copper)",
          }}
        />

        {/* Right element (e.g. eye toggle) */}
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="mt-1.5 text-[12px] text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
