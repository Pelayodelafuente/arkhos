"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Home, FolderKanban, StickyNote, TrendingUp, Wallet, CreditCard, Shield, BookOpen } from "lucide-react";
import { ArkhosLogo } from "@/components/ui/arkhos-logo";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(auth)/actions";
import { MODULE_COLORS } from "@/lib/constants/colors";

const navItems = [
  { label: "Inicio", href: "/", icon: Home, dot: null },
  { label: "Proyectos", href: "/proyectos", icon: FolderKanban, dot: MODULE_COLORS.proyectos },
  { label: "Notas", href: "/notas", icon: StickyNote, dot: MODULE_COLORS.notas },
  { label: "Mercados", href: "/mercados", icon: TrendingUp, dot: MODULE_COLORS.mercados },
  { label: "Patrimonio", href: "/patrimonio", icon: Wallet, dot: MODULE_COLORS.patrimonio },
  { label: "Gastos", href: "/gastos", icon: CreditCard, dot: MODULE_COLORS.gastos },
] as const;

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  userName: string;
}

export function MobileDrawer({ open, onClose, userName }: MobileDrawerProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect -- drawer mount/unmount animation
      setClosing(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setMounted(false);
      setClosing(false);
      onClose();
    }, 250);
  }, [onClose]);

  if (!mounted) return null;

  return (
    <>
      {/* Overlay with fade + blur */}
      <div
        className="fixed inset-0 z-40 lg:hidden"
        style={{
          backgroundColor: "var(--overlay-drawer)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          animation: closing
            ? "fade-out 200ms var(--ease-out-expo) forwards"
            : "fade-in 200ms var(--ease-out-expo) forwards",
        }}
        onClick={handleClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col lg:hidden"
        style={{
          backgroundColor: "var(--bg-sidebar)",
          animation: closing
            ? "slide-out-left 250ms var(--ease-out-expo) forwards"
            : "slide-in-left 250ms var(--ease-out-expo) forwards",
        }}
      >
        <div className="flex items-center justify-between px-5 py-6">
          <ArkhosLogo size="sm" />
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-sand"
            aria-label="Cerrar menú"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <nav className="flex-1 px-3">
          <ul className="space-y-0.5">
            {navItems.map(({ label, href, icon: Icon, dot }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={handleClose}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-card text-accent"
                        : "text-text-secondary hover:bg-sand hover:text-foreground"
                    }`}
                  >
                    {dot ? (
                      <span
                        className={`h-2 w-2 flex-shrink-0 rounded-full ${isActive ? "dot-pulse-active" : ""}`}
                        style={{
                          backgroundColor: isActive ? "#FBF0EA" : dot,
                          "--dot-color": dot,
                        } as React.CSSProperties}
                      />
                    ) : (
                      <span className="h-2 w-2 flex-shrink-0" />
                    )}
                    <Icon size={16} strokeWidth={1.75} className="flex-shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Docs */}
        <div className="px-3 pb-1">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClose}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-text-tertiary transition-colors hover:bg-sand hover:text-accent"
          >
            <span className="h-2 w-2 flex-shrink-0" />
            <BookOpen size={16} strokeWidth={1.75} className="flex-shrink-0" />
            Documentación
          </a>
        </div>

        {/* Settings */}
        <div className="border-t px-3 py-3" style={{ borderTopColor: "var(--border-subtle)" }}>
          <Link
            href="/settings"
            onClick={handleClose}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              pathname.startsWith("/settings")
                ? "bg-card text-accent"
                : "text-text-secondary hover:bg-sand hover:text-foreground"
            }`}
          >
            <span className="h-2 w-2 flex-shrink-0" />
            <Shield size={16} strokeWidth={1.75} className="flex-shrink-0" />
            Configuracion
          </Link>
        </div>

        <div className="border-t px-4 py-4" style={{ borderTopColor: "var(--border-subtle)" }}>
          <p className="mb-2 truncate text-xs text-text-tertiary" title={userName}>
            {userName}
          </p>
          <form action={logout}>
            <Button type="submit" variant="secondary" size="sm" className="w-full">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
