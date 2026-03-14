"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Home, FolderKanban, TrendingUp, Wallet, Receipt } from "lucide-react";
import { ArkhosLogo } from "@/components/ui/arkhos-logo";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(auth)/actions";

const navItems = [
  { label: "Inicio", href: "/", icon: Home, dot: null },
  { label: "Proyectos", href: "/proyectos", icon: FolderKanban, dot: "#C4704A" },
  { label: "Mercados", href: "/mercados", icon: TrendingUp, dot: "#9B7A4A" },
  { label: "Patrimonio", href: "/patrimonio", icon: Wallet, dot: "#5B8C6A" },
  { label: "Gastos", href: "/gastos", icon: Receipt, dot: "#4A7A9B" },
] as const;

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  userName: string;
}

export function MobileDrawer({ open, onClose, userName }: MobileDrawerProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-foreground/20 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-sand lg:hidden">
        <div className="flex items-center justify-between px-5 py-6">
          <ArkhosLogo size="sm" />
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-border"
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
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-[#FBF0EA]"
                        : "text-text-secondary hover:bg-border hover:text-foreground"
                    }`}
                  >
                    {dot ? (
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: isActive ? "#FBF0EA" : dot }}
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
