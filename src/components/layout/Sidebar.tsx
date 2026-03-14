"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderKanban, TrendingUp, Wallet, Receipt, Shield, BookOpen } from "lucide-react";
import { ArkhosLogo } from "@/components/ui/arkhos-logo";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(auth)/actions";

const navItems = [
  {
    label: "Inicio",
    href: "/",
    icon: Home,
    dot: null,
  },
  {
    label: "Proyectos",
    href: "/proyectos",
    icon: FolderKanban,
    dot: "#C4704A",
  },
  {
    label: "Mercados",
    href: "/mercados",
    icon: TrendingUp,
    dot: "#9B7A4A",
  },
  {
    label: "Patrimonio",
    href: "/patrimonio",
    icon: Wallet,
    dot: "#5B8C6A",
  },
  {
    label: "Gastos",
    href: "/gastos",
    icon: Receipt,
    dot: "#4A7A9B",
  },
] as const;

interface SidebarProps {
  userName: string;
}

export function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[260px] flex-col border-r border-border bg-sand">
      {/* Logo */}
      <div className="px-5 py-6">
        <ArkhosLogo size="sm" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        <ul className="space-y-0.5">
          {navItems.map(({ label, href, icon: Icon, dot }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <li key={href}>
                <Link
                  href={href}
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
                  <Icon
                    size={16}
                    strokeWidth={1.75}
                    className="flex-shrink-0"
                  />
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
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-text-tertiary transition-colors hover:bg-border hover:text-accent"
        >
          <span className="h-2 w-2 flex-shrink-0" />
          <BookOpen size={16} strokeWidth={1.75} className="flex-shrink-0" />
          Documentación
        </a>
      </div>

      {/* Settings */}
      <div className="border-t border-border px-3 py-3">
        <Link
          href="/settings/security"
          className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
            pathname === "/settings/security"
              ? "bg-accent text-[#FBF0EA]"
              : "text-text-secondary hover:bg-border hover:text-foreground"
          }`}
        >
          <span className="h-2 w-2 flex-shrink-0" />
          <Shield size={16} strokeWidth={1.75} className="flex-shrink-0" />
          Seguridad
        </Link>
      </div>

      {/* User + logout */}
      <div className="border-t border-border px-4 py-4">
        <p
          className="mb-2 truncate text-xs text-text-tertiary"
          title={userName}
        >
          {userName}
        </p>
        <form action={logout}>
          <Button type="submit" variant="secondary" size="sm" className="w-full">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </aside>
  );
}
