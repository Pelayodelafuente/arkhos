"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderKanban, TrendingUp, Wallet, CreditCard } from "lucide-react";

const navItems = [
  { label: "Inicio", href: "/", icon: Home },
  { label: "Proyectos", href: "/proyectos", icon: FolderKanban },
  { label: "Mercados", href: "/mercados", icon: TrendingUp },
  { label: "Patrimonio", href: "/patrimonio", icon: Wallet },
  { label: "Gastos", href: "/gastos", icon: CreditCard },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center border-t border-border bg-card lg:hidden">
      {navItems.map(({ label, href, icon: Icon }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
              isActive ? "text-accent" : "text-text-tertiary"
            }`}
          >
            <span
              className="transition-transform duration-200"
              style={isActive ? { transform: "scale(1.1)", transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" } : undefined}
            >
              <Icon size={20} strokeWidth={1.75} />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
