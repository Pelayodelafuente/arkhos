"use client";

import { Search } from "lucide-react";
import { ArkhosLogo } from "@/components/ui/arkhos-logo";

interface TopbarProps {
  userName: string;
}

// Topbar móvil: logo + búsqueda (abre la paleta de comandos).
// La navegación vive en el BottomNav (dock móvil); el drawer lateral se retiró.
export function Topbar({ userName }: TopbarProps) {
  void userName; // el perfil vive en el dock inferior

  return (
    <header
      className="relative flex min-h-[3.5rem] items-center justify-between border-b px-4 pt-[env(safe-area-inset-top)] lg:hidden"
      style={{
        backgroundColor: "var(--topbar-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottomColor: "var(--border-subtle)",
        color: "var(--text-primary)",
      }}
    >
      <ArkhosLogo size="sm" />
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("arkhos:open-palette"))}
        className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-sand"
        aria-label="Buscar y captura rápida"
      >
        <Search size={19} strokeWidth={1.75} />
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
  );
}
