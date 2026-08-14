"use client";

import { AlertCircle } from "lucide-react";

interface AuthErrorProps {
  message: string;
  className?: string;
}

/** Banner de error con color de brand (tokens --error-*). Reemplaza los `text-red-400` sueltos. */
export function AuthError({ message, className = "" }: AuthErrorProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] ${className}`}
      style={{
        background: "var(--error-bg)",
        border: "1px solid var(--error-border)",
        color: "var(--error-text)",
        animation: "auth-shake 0.4s ease-out",
      }}
    >
      <AlertCircle size={15} strokeWidth={1.75} className="flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
