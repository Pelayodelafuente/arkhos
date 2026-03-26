"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { ArkhosLogo } from "@/components/ui/arkhos-logo";
import { MobileDrawer } from "./mobile-drawer";

interface TopbarProps {
  userName: string;
}

export function Topbar({ userName }: TopbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header
        className="relative flex h-14 items-center justify-between border-b px-4 lg:hidden"
        style={{
          backgroundColor: "rgba(242, 237, 230, 0.88)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottomColor: "var(--border-subtle)",
          color: "var(--text-primary)",
        }}
      >
        <ArkhosLogo size="sm" />
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-sand"
          aria-label="Abrir menú"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
        {/* Decorative gradient line */}
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(196,112,74,0.20), transparent)',
          }}
        />
      </header>

      <MobileDrawer open={open} onClose={() => setOpen(false)} userName={userName} />
    </>
  );
}
