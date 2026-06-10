"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Matches --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15, ease: EASE_OUT },
    pointerEvents: "none" as const,
  },
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const titleId = "modal-title";

export function Modal({ open, onClose, title, children, footer, className = "" }: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Mover el foco al modal al abrir y restaurarlo al elemento previo al cerrar
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const card = cardRef.current;
    const first = card?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? card)?.focus();
    return () => {
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Focus trap: Tab nunca escapa del modal
      if (e.key === "Tab") {
        const card = cardRef.current;
        if (!card) return;
        const focusables = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => el.offsetParent !== null
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const inside = active ? card.contains(active) : false;
        if (e.shiftKey && (!inside || active === firstEl)) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && (!inside || active === lastEl)) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-8">
          {/* Overlay */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 z-[60] bg-foreground/30 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Card */}
          <motion.div
            ref={cardRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative z-[61] my-auto w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-card ${className}`}
            style={{ boxShadow: "var(--shadow-modal)" }}
          >
            {/* Decorative top line */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                background: 'linear-gradient(90deg, transparent, var(--accent-terracotta), transparent)',
                opacity: 0.6,
                zIndex: 1,
              }}
            />
            {title && (
              <div className="sticky top-0 z-10 flex flex-shrink-0 items-start justify-between gap-4 border-b border-border bg-card px-6 pb-4 pt-6">
                <h2 id={titleId} className="font-heading text-xl text-foreground">{title}</h2>
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl text-text-tertiary transition-colors hover:bg-sand hover:text-foreground"
                  aria-label="Cerrar"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
            {footer && (
              <div className="flex-shrink-0 border-t border-border bg-card px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
