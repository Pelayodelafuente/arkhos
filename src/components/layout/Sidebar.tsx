"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FolderKanban,
  StickyNote,
  TrendingUp,
  Wallet,
  CreditCard,
  Shield,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ArkhosLogo } from "@/components/ui/arkhos-logo";
import { ArkhosIcon } from "@/components/ui/arkhos-icon";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(auth)/actions";
import { useUIStore } from "@/stores/ui-store";

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
    label: "Notas",
    href: "/notas",
    icon: StickyNote,
    dot: "#7a9b76",
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
    icon: CreditCard,
    dot: "#4A7A9B",
  },
] as const;

interface SidebarProps {
  userName: string;
}

export function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useUIStore((s) => s.toggleSidebarCollapsed);
  const loadSidebarState = useUIStore((s) => s.loadSidebarState);

  useEffect(() => {
    loadSidebarState();
  }, [loadSidebarState]);

  return (
    <aside
      className="flex h-screen flex-col border-r border-border bg-sand"
      style={{
        width: collapsed ? 56 : 240,
        transition: "width 250ms cubic-bezier(0.16,1,0.3,1)",
        overflow: "hidden",
      }}
    >
      {/* Logo + collapse toggle */}
      <div
        className="flex items-center"
        style={{
          padding: collapsed ? "16px 0" : "16px 20px",
          justifyContent: collapsed ? "center" : "space-between",
          minHeight: 56,
        }}
      >
        {collapsed ? (
          <ArkhosIcon size={22} />
        ) : (
          <ArkhosLogo size="sm" />
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-border hover:text-foreground"
            style={{ width: 28, height: 28 }}
            title="Colapsar sidebar"
          >
            <PanelLeftClose size={15} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-border hover:text-foreground"
            style={{ width: 32, height: 28 }}
            title="Expandir sidebar"
          >
            <PanelLeftOpen size={15} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1" style={{ padding: collapsed ? "0 6px" : "0 12px" }}>
        <ul className="space-y-0.5">
          {navItems.map(({ label, href, icon: Icon, dot }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`group flex items-center rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-accent text-[#FBF0EA]"
                      : "text-text-secondary hover:bg-border hover:text-foreground"
                  }`}
                  style={{
                    gap: collapsed ? 0 : 12,
                    padding: collapsed ? "10px 0" : "10px 12px",
                    justifyContent: collapsed ? "center" : "flex-start",
                  }}
                  title={collapsed ? label : undefined}
                >
                  {!collapsed && dot ? (
                    <span
                      className={`h-2 w-2 flex-shrink-0 rounded-full ${isActive ? "dot-pulse-active" : ""}`}
                      style={{
                        backgroundColor: isActive ? "#FBF0EA" : dot,
                        "--dot-color": dot,
                      } as React.CSSProperties}
                    />
                  ) : !collapsed ? (
                    <span className="h-2 w-2 flex-shrink-0" />
                  ) : null}
                  <span
                    className="flex items-center gap-2 transition-transform duration-150 group-hover:translate-x-[2px]"
                    style={{
                      transform: collapsed ? "none" : undefined,
                    }}
                  >
                    <Icon
                      size={collapsed ? 18 : 16}
                      strokeWidth={1.75}
                      className="flex-shrink-0"
                    />
                    {!collapsed && label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Docs */}
      {!collapsed && (
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
      )}

      {/* Settings */}
      <div
        className="border-t border-border"
        style={{ padding: collapsed ? "8px 6px" : "12px 12px" }}
      >
        <Link
          href="/settings/security"
          className={`flex items-center rounded-md text-sm font-medium transition-colors ${
            pathname === "/settings/security"
              ? "bg-accent text-[#FBF0EA]"
              : "text-text-secondary hover:bg-border hover:text-foreground"
          }`}
          style={{
            gap: collapsed ? 0 : 12,
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
          title={collapsed ? "Seguridad" : undefined}
        >
          {!collapsed && <span className="h-2 w-2 flex-shrink-0" />}
          <Shield size={collapsed ? 18 : 16} strokeWidth={1.75} className="flex-shrink-0" />
          {!collapsed && "Seguridad"}
        </Link>
      </div>

      {/* User + logout */}
      <div
        className="border-t border-border"
        style={{ padding: collapsed ? "12px 6px" : "16px 16px" }}
      >
        {!collapsed && (
          <p
            className="mb-2 truncate text-xs text-text-tertiary"
            title={userName}
          >
            {userName}
          </p>
        )}
        <form action={logout}>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className={collapsed ? "w-full px-0" : "w-full"}
            title={collapsed ? "Cerrar sesión" : undefined}
          >
            {collapsed ? "×" : "Cerrar sesión"}
          </Button>
        </form>
      </div>
    </aside>
  );
}
