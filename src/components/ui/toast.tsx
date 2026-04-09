"use client";

import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { useUIStore, type UIStore, type Toast, type ToastVariant } from "@/stores/ui-store";

const variantConfig: Record<
  ToastVariant,
  { icon: typeof Info; color: string; bg: string }
> = {
  success: { icon: CheckCircle, color: "var(--success-text)", bg: "var(--success-bg)" },
  error:   { icon: XCircle,     color: "var(--error-text)",   bg: "var(--error-bg)" },
  info:    { icon: Info,        color: "var(--accent-terracotta)", bg: "var(--accent-hover-bg)" },
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useUIStore((s: UIStore) => s.removeToast);
  const { icon: Icon, color, bg } = variantConfig[toast.variant];

  return (
    <div
      className="animate-slide-in-right relative flex w-80 items-start gap-3 overflow-hidden rounded-xl bg-card p-4"
      style={{ border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-modal)" }}
    >
      <span
        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: bg }}
      >
        <Icon size={13} style={{ color }} strokeWidth={2} />
      </span>
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <p className="text-sm text-foreground">{toast.message}</p>
        {toast.action && (
          <button
            onClick={() => { toast.action!.onClick(); removeToast(toast.id); }}
            className="self-start text-xs font-medium underline underline-offset-2 transition-opacity hover:opacity-70"
            style={{ color }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:text-foreground"
        aria-label="Cerrar"
      >
        <X size={13} strokeWidth={2} />
      </button>
      {/* Auto-dismiss progress */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden rounded-b-xl">
        <div
          className="h-full origin-left"
          style={{
            backgroundColor: color,
            animation: "toast-progress 4s linear forwards",
          }}
        />
      </div>
    </div>
  );
}

export function ToastProvider() {
  const toasts = useUIStore((s: UIStore) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="fixed right-4 top-4 z-[100] flex flex-col gap-2 transition-all duration-200"
    >
      {toasts.map((toast: Toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
