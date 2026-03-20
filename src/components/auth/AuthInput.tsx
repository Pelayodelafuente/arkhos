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
          style={{ color: "var(--auth-gray)" }}
        />

        {/* Input */}
        <input
          ref={ref}
          id={id}
          placeholder=" "
          className={`peer h-[48px] w-full rounded-xl border bg-transparent pl-10 pr-${rightElement ? "11" : "4"} pt-4 pb-1 text-[14px] outline-none transition-all duration-200`}
          style={{
            color: "var(--auth-text)",
            borderColor: error ? "#DC2626" : "var(--auth-border)",
            caretColor: "var(--auth-copper)",
            animation: error ? "auth-shake 0.4s ease-out" : undefined,
          }}
          {...props}
        />

        {/* Floating label */}
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 text-[14px] transition-all duration-200 peer-focus:top-[13px] peer-focus:-translate-y-0 peer-focus:text-[11px] peer-[&:not(:placeholder-shown)]:top-[13px] peer-[&:not(:placeholder-shown)]:-translate-y-0 peer-[&:not(:placeholder-shown)]:text-[11px]"
          style={{ color: "var(--auth-gray)" }}
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
