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
    dotGlow: null,
  },
  {
    label: "Proyectos",
    href: "/proyectos",
    icon: FolderKanban,
    dot: "#C4704A",
    dotGlow: "0 0 6px rgba(196,112,74,0.55)",
  },
  {
    label: "Notas",
    href: "/notas",
    icon: StickyNote,
    dot: "var(--module-notas)",
    dotGlow: "0 0 6px rgba(122,155,118,0.50)",
  },
  {
    label: "Mercados",
    href: "/mercados",
    icon: TrendingUp,
    dot: "#9a6a28",
    dotGlow: "0 0 6px rgba(154,106,40,0.50)",
  },
  {
    label: "Patrimonio",
    href: "/patrimonio",
    icon: Wallet,
    dot: "#056b63",
    dotGlow: "0 0 6px rgba(5,107,99,0.50)",
  },
  {
    label: "Gastos",
    href: "/gastos",
    icon: CreditCard,
    dot: "#5f1b29",
    dotGlow: "0 0 6px rgba(95,27,41,0.50)",
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
      className="relative flex h-screen flex-col border-r"
      style={{
        width: collapsed ? 56 : 240,
        transition: "width 250ms cubic-bezier(0.16,1,0.3,1)",
        overflow: "hidden",
        borderRightColor: "var(--sb-border)",
        backgroundColor: '#1e1510',
        backgroundImage: `
          linear-gradient(rgba(255,220,160,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,220,160,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
      }}
    >
      {/* Glow terracota esquina superior derecha */}
      <div
        style={{
          position: 'absolute', top: -60, right: -60,
          width: 240, height: 240,
          background: 'radial-gradient(circle, rgba(196,112,74,0.10) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />
      {/* Línea shimmer borde derecho */}
      <div
        className="animate-[sb-glow_4s_ease-in-out_infinite]"
        style={{
          position: 'absolute', right: 0, top: '18%', bottom: '18%',
          width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(196,112,74,0.22) 35%, rgba(230,196,152,0.42) 50%, rgba(196,112,74,0.22) 65%, transparent)',
          pointerEvents: 'none', zIndex: 10,
        }}
      />
      {/* Top gradient stripe */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0"
        style={{
          height: 3,
          background: "linear-gradient(90deg, #3a1208, var(--crimson) 25%, var(--accent-terracotta) 55%, var(--orange) 100%)",
        }}
      />
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
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(196,112,74,0.22), rgba(95,27,41,0.32))',
              border: '1px solid rgba(196,112,74,0.26)',
              boxShadow: '0 0 18px rgba(196,112,74,0.12)',
              borderRadius: 8,
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArkhosIcon size={22} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                background: 'linear-gradient(145deg, rgba(196,112,74,0.22), rgba(95,27,41,0.32))',
                border: '1px solid rgba(196,112,74,0.26)',
                boxShadow: '0 0 18px rgba(196,112,74,0.12)',
                borderRadius: 8,
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArkhosIcon size={18} />
            </div>
            <span style={{ color: 'var(--sb-text-primary)', fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>
              Arkhos<em style={{ color: 'var(--accent-light)', fontStyle: 'italic', fontWeight: 400 }}>.</em>
            </span>
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex items-center justify-center rounded-md transition-colors"
            style={{ width: 28, height: 28, color: 'var(--sb-text-muted)' }}
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
            className="flex items-center justify-center rounded-md transition-colors"
            style={{ width: 32, height: 28, color: 'var(--sb-text-muted)' }}
            title="Expandir sidebar"
          >
            <PanelLeftOpen size={15} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1" style={{ padding: collapsed ? "0 6px" : "0 12px" }}>
        <ul className="space-y-0.5">
          {navItems.map(({ label, href, icon: Icon, dot, dotGlow }, index) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200 animate-fade-up`}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,200,120,0.07)";
                      (e.currentTarget as HTMLAnchorElement).style.color = "var(--sb-text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "";
                      (e.currentTarget as HTMLAnchorElement).style.color = "";
                    }
                  }}
                  style={{
                    gap: collapsed ? 0 : 12,
                    padding: collapsed ? "10px 0" : "10px 12px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    color: isActive ? "var(--accent-light)" : "var(--sb-text-secondary)",
                    backgroundColor: isActive ? "rgba(196,112,74,0.13)" : undefined,
                    border: isActive ? "1px solid rgba(196,112,74,0.20)" : "1px solid transparent",
                    animationDelay: `${index * 60}ms`,
                  }}
                  title={collapsed ? label : undefined}
                >
                  {/* Active left bar */}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '20%',
                        bottom: '20%',
                        width: 3,
                        borderRadius: 999,
                        backgroundColor: 'var(--accent-light)',
                        boxShadow: '0 0 10px rgba(196,112,74,0.55)',
                      }}
                    />
                  )}
                  {!collapsed && dot ? (
                    <span
                      className={`h-2 w-2 flex-shrink-0 rounded-full ${isActive ? "dot-pulse-active" : ""}`}
                      style={{
                        backgroundColor: isActive ? "var(--accent-light)" : dot,
                        boxShadow: isActive ? dotGlow ?? undefined : undefined,
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
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
            style={{ color: 'var(--sb-text-muted)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,200,120,0.07)";
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent-light)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "";
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--sb-text-muted)";
            }}
          >
            <span className="h-2 w-2 flex-shrink-0" />
            <BookOpen size={16} strokeWidth={1.75} className="flex-shrink-0" />
            Documentación
          </a>
        </div>
      )}

      {/* Settings */}
      <div
        className="border-t"
        style={{ padding: collapsed ? "8px 6px" : "12px 12px", borderTopColor: "var(--sb-border)" }}
      >
        <Link
          href="/settings/security"
          className="flex items-center rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            gap: collapsed ? 0 : 12,
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            color: pathname === "/settings/security" ? "var(--accent-light)" : "var(--sb-text-secondary)",
            backgroundColor: pathname === "/settings/security" ? "rgba(196,112,74,0.13)" : undefined,
            border: pathname === "/settings/security" ? "1px solid rgba(196,112,74,0.20)" : "1px solid transparent",
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
        className="border-t"
        style={{ padding: collapsed ? "12px 6px" : "16px 16px", borderTopColor: "var(--sb-border)" }}
      >
        {!collapsed && (
          <div
            className="mb-2 rounded-xl px-3 py-2 transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(196,112,74,0.28)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--accent-terracotta), var(--crimson))' }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-xs font-medium"
                  style={{ color: 'var(--sb-text-primary)' }}
                  title={userName}
                >
                  {userName}
                </p>
                <p
                  className="text-[9px] uppercase tracking-wider"
                  style={{ color: 'var(--sb-text-muted)', fontFamily: 'var(--font-mono)' }}
                >
                  workspace
                </p>
              </div>
            </div>
          </div>
        )}
        <form action={logout}>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className={collapsed ? "w-full px-0" : "w-full"}
            style={{ borderColor: "var(--sb-border)", color: "var(--sb-text-secondary)", background: "rgba(255,255,255,0.04)" }}
            title={collapsed ? "Cerrar sesión" : undefined}
          >
            {collapsed ? "×" : "Cerrar sesión"}
          </Button>
        </form>
      </div>
    </aside>
  );
}
