"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

export interface DropdownMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  trigger?: ReactNode;
  align?: "left" | "right";
}

export function DropdownMenu({ items, trigger, align = "right" }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center rounded-md p-1.5 text-text-tertiary transition-colors hover:bg-sand hover:text-foreground"
        aria-label="Más opciones"
        aria-expanded={open}
      >
        {trigger ?? <MoreHorizontal size={16} strokeWidth={2} />}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-card py-1 ${
            align === "right" ? "right-0" : "left-0"
          }`}
          style={{ boxShadow: "var(--shadow-modal)" }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                item.variant === "danger"
                  ? "text-red-500 hover:bg-red-50"
                  : "text-text-secondary hover:bg-sand hover:text-foreground"
              }`}
            >
              {item.icon && (
                <span className="flex-shrink-0">{item.icon}</span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
