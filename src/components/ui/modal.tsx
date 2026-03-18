"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className = "" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="animate-fade-in absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Card */}
      <div
        className={`animate-scale-in relative z-10 w-full max-w-md rounded-xl bg-card p-6 ${className}`}
        style={{ boxShadow: "var(--shadow-modal)" }}
      >
        {title && (
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="font-heading text-xl text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-sand hover:text-foreground"
              aria-label="Cerrar"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
