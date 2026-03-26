"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative z-[61] w-full max-w-md overflow-hidden rounded-2xl bg-card p-6 ${className}`}
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
              }}
            />
            {title && (
              <div className="mb-5 flex items-start justify-between gap-4">
                <h2 className="font-heading text-xl text-foreground">{title}</h2>
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl text-text-tertiary transition-colors hover:bg-sand hover:text-foreground"
                  aria-label="Cerrar"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
