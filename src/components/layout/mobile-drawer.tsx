"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Home, FolderKanban, TrendingUp, Wallet, CreditCard, Shield, BookOpen } from "lucide-react";
import { ArkhosLogo } from "@/components/ui/arkhos-logo";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(auth)/actions";

const navItems = [
  { label: "Inicio", href: "/", icon: Home, dot: null },
  { label: "Proyectos", href: "/proyectos", icon: FolderKanban, dot: "#8AAC7E" },
  { label: "Mercados", href: "/mercados", icon: TrendingUp, dot: "#7AACCC" },
  { label: "Patrimonio", href: "/patrimonio", icon: Wallet, dot: "#C9A96E" },
  { label: "Gastos", href: "/gastos", icon: CreditCard, dot: "#C87A8A" },
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
      setMounted(true);
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
          backgroundColor: "rgba(0, 0, 0, 0.4)",
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
        className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-surface lg:hidden"
        style={{
          animation: closing
            ? "slide-out-left 250ms var(--ease-out-expo) forwards"
            : "slide-in-left 250ms var(--ease-out-expo) forwards",
        }}
      >
        <div className="flex items-center justify-between px-5 py-6">
          <ArkhosLogo size="sm" />
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-surface-2"
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
                        ? "text-accent"
                        : "text-text-secondary hover:bg-surface-2 hover:text-foreground"
                    }`}
                    style={isActive ? { background: "rgba(138,172,126,0.12)" } : undefined}
                  >
                    {dot ? (
                      <span
                        className={`h-2 w-2 flex-shrink-0 rounded-full ${isActive ? "dot-pulse-active" : ""}`}
                        style={{
                          backgroundColor: dot,
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
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-text-tertiary transition-colors hover:bg-surface-2 hover:text-accent"
          >
            <span className="h-2 w-2 flex-shrink-0" />
            <BookOpen size={16} strokeWidth={1.75} className="flex-shrink-0" />
            Documentación
          </a>
        </div>

        {/* Security */}
        <div className="border-t border-border px-3 py-3">
          <Link
            href="/settings/security"
            onClick={handleClose}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              pathname === "/settings/security"
                ? "text-accent"
                : "text-text-secondary hover:bg-surface-2 hover:text-foreground"
            }`}
            style={pathname === "/settings/security" ? { background: "rgba(138,172,126,0.12)" } : undefined}
          >
            <span className="h-2 w-2 flex-shrink-0" />
            <Shield size={16} strokeWidth={1.75} className="flex-shrink-0" />
            Seguridad
          </Link>
        </div>

        <div className="border-t border-border px-4 py-4">
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
