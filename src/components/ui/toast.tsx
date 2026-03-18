"use client";

import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { useUIStore, type UIStore, type Toast, type ToastVariant } from "@/stores/ui-store";

const variantConfig: Record<
  ToastVariant,
  { icon: typeof Info; color: string; bg: string }
> = {
  success: { icon: CheckCircle, color: "#5B8C6A", bg: "rgba(91,140,106,0.08)" },
  error:   { icon: XCircle,     color: "#DC2626", bg: "rgba(220,38,38,0.08)" },
  info:    { icon: Info,        color: "#C4704A", bg: "rgba(196,112,74,0.08)" },
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useUIStore((s: UIStore) => s.removeToast);
  const { icon: Icon, color, bg } = variantConfig[toast.variant];

  return (
    <div
      className="animate-slide-in-right relative flex w-80 items-start gap-3 overflow-hidden rounded-xl border border-border bg-card p-4"
      style={{ boxShadow: "var(--shadow-modal)" }}
    >
      <span
        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: bg }}
      >
        <Icon size={13} style={{ color }} strokeWidth={2} />
      </span>
      <p className="flex-1 text-sm text-foreground">{toast.message}</p>
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
    <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2 transition-all duration-200">
      {toasts.map((toast: Toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
