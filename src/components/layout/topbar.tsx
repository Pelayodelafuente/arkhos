"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ArkhosLogo } from "@/components/ui/arkhos-logo";
import { MobileDrawer } from "./mobile-drawer";

interface TopbarProps {
  userName: string;
}

export function Topbar({ userName }: TopbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface-2 px-4 lg:hidden">
        <ArkhosLogo size="sm" />
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface"
          aria-label="Abrir menú"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
      </header>

      <MobileDrawer open={open} onClose={() => setOpen(false)} userName={userName} />
    </>
  );
}
