"use client";

import { useEffect, useRef, useState } from "react";
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
  Search,
} from "lucide-react";
import { ArkhosIcon } from "@/components/ui/arkhos-icon";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(auth)/actions";
import { useUIStore } from "@/stores/ui-store";
import { useToast } from "@/stores/ui-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useNotesStore } from "@/stores/notes-store";
import { MODULE_COLORS } from "@/lib/constants/colors";

const moduleItems = [
  {
    label: "Proyectos",
    href: "/proyectos",
    icon: FolderKanban,
    dot: MODULE_COLORS.proyectos,
    dotGlow: "0 0 6px rgba(196,112,74,0.55)",
    countKey: "proyectos" as const,
  },
  {
    label: "Notas",
    href: "/notas",
    icon: StickyNote,
    dot: MODULE_COLORS.notas,
    dotGlow: "0 0 6px rgba(176,122,58,0.50)",
    countKey: "notas" as const,
  },
  {
    label: "Mercados",
    href: "/mercados",
    icon: TrendingUp,
    dot: MODULE_COLORS.mercados,
    dotGlow: "0 0 6px rgba(114,96,196,0.50)",
    countKey: "mercados" as const,
  },
  {
    label: "Patrimonio",
    href: "/patrimonio",
    icon: Wallet,
    dot: MODULE_COLORS.patrimonio,
    dotGlow: "0 0 6px rgba(46,125,107,0.50)",
    countKey: "patrimonio" as const,
  },
  {
    label: "Gastos",
    href: "/gastos",
    icon: CreditCard,
    dot: MODULE_COLORS.gastos,
    dotGlow: "0 0 6px rgba(59,120,176,0.50)",
    countKey: "gastos" as const,
  },
] as const;

interface SidebarProps {
  userName: string;
  initialProjectCount?: number;
  initialNoteCount?: number;
}

export function Sidebar({ userName, initialProjectCount = 0, initialNoteCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useUIStore((s) => s.toggleSidebarCollapsed);
  const loadSidebarState = useUIStore((s) => s.loadSidebarState);
  const toast = useToast();

  const collapseTimer = useRef<NodeJS.Timeout | null>(null);

  // Stagger animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const prevCollapsed = useRef(collapsed);

  // Store counts — fallback a los valores del servidor mientras el store no ha cargado todavía
  // Only count active projects (not archived) and active notes (not archived/trashed)
  const storeProjectCount = useProjectsStore((s) =>
    s.initialized ? s.projects.filter((p) => p.status !== "archived").length : null
  );
  const storeNoteCount = useNotesStore((s) =>
    s.initialized ? s.notes.filter((n) => !n.archived).length : null
  );
  const projectCount = storeProjectCount ?? initialProjectCount;
  const noteCount = storeNoteCount ?? initialNoteCount;

  const isDashboard = pathname === "/";

  useEffect(() => {
    loadSidebarState();
  }, [loadSidebarState]);

  useEffect(() => {
    if (prevCollapsed.current && !collapsed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAnimating(true);
      const t = setTimeout(() => setIsAnimating(false), 400);
      prevCollapsed.current = collapsed;
      return () => clearTimeout(t);
    }
    prevCollapsed.current = collapsed;
  }, [collapsed]);

  function getCount(countKey: (typeof moduleItems)[number]["countKey"]): number | null {
    if (countKey === "proyectos") return projectCount;
    if (countKey === "notas") return noteCount;
    return null;
  }

  const gradientDivider = (
    <div
      style={{
        height: 1,
        background:
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent)",
        margin: "6px 10px",
      }}
    />
  );

  return (
    <aside
      className="relative flex h-screen flex-col border-r"
      onMouseEnter={() => {
        clearTimeout(collapseTimer.current!);
        if (useUIStore.getState().sidebarCollapsed) toggleCollapsed();
      }}
      onMouseLeave={(e) => {
        const related = e.relatedTarget as Node | null;
        if (e.currentTarget.contains(related)) return;
        collapseTimer.current = setTimeout(() => {
          if (!useUIStore.getState().sidebarCollapsed) toggleCollapsed();
        }, 250);
      }}
      style={{
        width: collapsed ? 56 : 240,
        transition: "width 250ms cubic-bezier(0.16,1,0.3,1)",
        overflow: "hidden",
        borderRightColor: "var(--sb-border)",
        backgroundColor: "#1e1510",
        backgroundImage: `
          linear-gradient(rgba(255,220,160,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,220,160,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px",
      }}
    >
      {/* Invisible hover-extension strip when collapsed */}
      {collapsed && (
        <div
          style={{
            position: "absolute",
            right: -8,
            top: 0,
            bottom: 0,
            width: 8,
            cursor: "default",
          }}
          onMouseEnter={() => clearTimeout(collapseTimer.current!)}
        />
      )}

      {/* Glow terracota esquina superior derecha */}
      <div
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 240,
          height: 240,
          background:
            "radial-gradient(circle, rgba(196,112,74,0.10) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Línea shimmer borde derecho */}
      <div
        className="animate-[sb-glow_4s_ease-in-out_infinite]"
        style={{
          position: "absolute",
          right: 0,
          top: "18%",
          bottom: "18%",
          width: 1,
          background:
            "linear-gradient(180deg, transparent, rgba(196,112,74,0.22) 35%, rgba(230,196,152,0.42) 50%, rgba(196,112,74,0.22) 65%, transparent)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />
      {/* Top gradient stripe */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0"
        style={{
          height: 3,
          background:
            "linear-gradient(90deg, #3a1208, var(--crimson) 25%, var(--accent-terracotta) 55%, var(--orange) 100%)",
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
              background:
                "linear-gradient(145deg, rgba(196,112,74,0.22), rgba(95,27,41,0.32))",
              border: "1px solid rgba(196,112,74,0.26)",
              boxShadow: "0 0 18px rgba(196,112,74,0.12)",
              borderRadius: 8,
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArkhosIcon size={22} />
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                background:
                  "linear-gradient(145deg, rgba(196,112,74,0.22), rgba(95,27,41,0.32))",
                border: "1px solid rgba(196,112,74,0.26)",
                boxShadow: "0 0 18px rgba(196,112,74,0.12)",
                borderRadius: 8,
                padding: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArkhosIcon size={18} />
            </div>
            <span
              style={{
                color: "var(--sb-text-primary)",
                fontWeight: 600,
                fontSize: 15,
                letterSpacing: "-0.01em",
              }}
            >
              Arkhos
              <em
                style={{
                  color: "var(--accent-light)",
                  fontStyle: "italic",
                  fontWeight: 400,
                }}
              >
                .
              </em>
            </span>
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex items-center justify-center rounded-md transition-colors"
            style={{ width: 28, height: 28, color: "var(--sb-text-muted)" }}
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
            style={{ width: 32, height: 28, color: "var(--sb-text-muted)" }}
            title="Expandir sidebar"
          >
            <PanelLeftOpen size={15} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* Search bar */}
      <div style={{ padding: collapsed ? "0 6px" : "0 12px", marginBottom: 6 }}>
        <div
          onClick={() => toast.info("Búsqueda global — próximamente")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: collapsed ? 0 : 7,
            justifyContent: collapsed ? "center" : "flex-start",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 7,
            padding: collapsed ? "7px 0" : "7px 10px",
            cursor: "pointer",
            transition: "border-color 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor =
              "rgba(196,112,74,0.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor =
              "rgba(255,255,255,0.07)";
          }}
        >
          <Search
            size={12}
            style={{
              opacity: 0.3,
              flexShrink: 0,
              color: "var(--sb-text-primary)",
            }}
          />
          {!collapsed && (
            <>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "rgba(196,150,100,0.35)",
                  flex: 1,
                }}
              >
                Buscar en Arkhos...
              </span>
              <kbd
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 4,
                  padding: "1px 6px",
                  color: "rgba(196,150,100,0.35)",
                }}
              >
                ⌘K
              </kbd>
            </>
          )}
        </div>
      </div>

      {gradientDivider}

      {/* DASHBOARD — bloque destacado */}
      <div style={{ padding: collapsed ? "0 6px" : "0 12px", marginBottom: 4 }}>
        <Link
          href="/"
          className="group relative flex items-center rounded-xl font-semibold transition-all duration-200"
          style={{
            gap: collapsed ? 0 : 10,
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            background: isDashboard
              ? "linear-gradient(135deg, rgba(196,112,74,0.18), rgba(95,27,41,0.22))"
              : "rgba(255,255,255,0.03)",
            border: isDashboard
              ? "1px solid rgba(196,112,74,0.28)"
              : "1px solid rgba(255,255,255,0.06)",
            color: isDashboard ? "var(--accent-light)" : "var(--sb-text-secondary)",
            boxShadow: isDashboard ? "0 2px 12px rgba(196,112,74,0.12)" : "none",
            fontSize: 13,
          }}
          onMouseEnter={(e) => {
            if (!isDashboard) {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,200,120,0.07)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.09)";
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--sb-text-primary)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isDashboard) {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.03)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--sb-text-secondary)";
            }
          }}
          title={collapsed ? "Dashboard" : undefined}
        >
          {isDashboard && (
            <span style={{
              position: "absolute", left: 0, top: "20%", bottom: "20%",
              width: 3, borderRadius: 999,
              backgroundColor: "var(--accent-light)",
              boxShadow: "0 0 10px rgba(196,112,74,0.55)",
            }} />
          )}
          <Home size={collapsed ? 18 : 16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
          {!collapsed && (
            <>
              <span style={{ flex: 1 }}>Dashboard</span>
              <span
                className={isDashboard ? "dot-pulse-active" : ""}
                style={{
                  width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                  background: "var(--module-patrimonio)",
                  boxShadow: "0 0 4px rgba(46,125,107,0.6)",
                }}
              />
            </>
          )}
        </Link>
      </div>

      {gradientDivider}

      {/* Section label: MÓDULOS */}
      {!collapsed && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px", marginBottom: 3 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "rgba(196,150,100,0.38)",
          }}>
            MÓDULOS
          </span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1" style={{ padding: collapsed ? "0 6px" : "0 12px" }}>
        <ul className="space-y-0.5">
          {moduleItems.map(({ label, href, icon: Icon, dot, dotGlow, countKey }, index) => {
            const isActive = pathname.startsWith(href);
            const count = getCount(countKey);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200 animate-fade-up${isAnimating ? " animate-fade-in-up" : ""}`}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                        "rgba(255,200,120,0.07)";
                      (e.currentTarget as HTMLAnchorElement).style.color =
                        "var(--sb-text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                        "";
                      (e.currentTarget as HTMLAnchorElement).style.color =
                        "var(--sb-text-secondary)";
                    }
                  }}
                  style={{
                    gap: collapsed ? 0 : 12,
                    padding: collapsed ? "10px 0" : "10px 12px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    color: isActive
                      ? "var(--accent-light)"
                      : "var(--sb-text-secondary)",
                    backgroundColor: isActive
                      ? "rgba(196,112,74,0.13)"
                      : undefined,
                    border: isActive
                      ? "1px solid rgba(196,112,74,0.20)"
                      : "1px solid transparent",
                    animationDelay: isAnimating
                      ? `${index * 40}ms`
                      : `${index * 60}ms`,
                  }}
                  title={collapsed ? label : undefined}
                >
                  {/* Active left bar */}
                  {isActive && (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "20%",
                        bottom: "20%",
                        width: 3,
                        borderRadius: 999,
                        backgroundColor: "var(--accent-light)",
                        boxShadow: "0 0 10px rgba(196,112,74,0.55)",
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

                  {/* Counter badge */}
                  {!collapsed && count !== null && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        background: isActive
                          ? "rgba(196,112,74,0.10)"
                          : "rgba(255,255,255,0.05)",
                        border: `1px solid ${isActive ? "rgba(196,112,74,0.20)" : "rgba(255,255,255,0.07)"}`,
                        padding: "1px 6px",
                        borderRadius: 10,
                        color: isActive
                          ? "var(--accent-terracotta)"
                          : "rgba(196,150,100,0.35)",
                        marginLeft: "auto",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {gradientDivider}

      {/* Docs */}
      {!collapsed && (
        <div className="px-3 pb-1">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
            style={{ color: "var(--sb-text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                "rgba(255,200,120,0.07)";
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--accent-light)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "";
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--sb-text-muted)";
            }}
          >
            <span className="h-2 w-2 flex-shrink-0" />
            <BookOpen size={16} strokeWidth={1.75} className="flex-shrink-0" />
            Documentación
          </a>
        </div>
      )}

      {gradientDivider}

      {/* Settings */}
      <div
        style={{ padding: collapsed ? "8px 6px" : "12px 12px" }}
      >
        <Link
          href="/settings/security"
          className="flex items-center rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            gap: collapsed ? 0 : 12,
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            color:
              pathname === "/settings/security"
                ? "var(--accent-light)"
                : "var(--sb-text-secondary)",
            backgroundColor:
              pathname === "/settings/security"
                ? "rgba(196,112,74,0.13)"
                : undefined,
            border:
              pathname === "/settings/security"
                ? "1px solid rgba(196,112,74,0.20)"
                : "1px solid transparent",
          }}
          title={collapsed ? "Seguridad" : undefined}
        >
          {!collapsed && <span className="h-2 w-2 flex-shrink-0" />}
          <Shield
            size={collapsed ? 18 : 16}
            strokeWidth={1.75}
            className="flex-shrink-0"
          />
          {!collapsed && "Seguridad"}
        </Link>
      </div>

      {gradientDivider}

      {/* User + logout */}
      <div
        style={{
          padding: collapsed ? "12px 6px" : "16px 16px",
        }}
      >
        {/* Status pills */}
        {!collapsed && (
          <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
            {(
              [
                { label: "DB", color: "#2ec490", glow: "rgba(46,196,144,0.6)" },
                {
                  label: "CDN",
                  color: "#2ec490",
                  glow: "rgba(46,196,144,0.6)",
                },
                {
                  label: "APIs",
                  color: "#e8a020",
                  glow: "rgba(232,160,32,0.5)",
                },
              ] as const
            ).map(({ label, color, glow }) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 7px",
                  borderRadius: 4,
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: color,
                    boxShadow: `0 0 3px ${glow}`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    color: "rgba(196,150,100,0.35)",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        {!collapsed && (
          <div
            className="mb-2 rounded-xl px-3 py-2 transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor =
                "rgba(196,112,74,0.28)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor =
                "rgba(255,255,255,0.07)";
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent-terracotta), var(--crimson))",
                }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-xs font-medium"
                  style={{ color: "var(--sb-text-primary)" }}
                  title={userName}
                >
                  {userName}
                </p>
                <p
                  className="text-[9px] uppercase tracking-wider"
                  style={{
                    color: "var(--sb-text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
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
            style={{
              borderColor: "var(--sb-border)",
              color: "var(--sb-text-secondary)",
              background: "rgba(255,255,255,0.04)",
            }}
            title={collapsed ? "Cerrar sesión" : undefined}
          >
            {collapsed ? "×" : "Cerrar sesión"}
          </Button>
        </form>
      </div>
    </aside>
  );
}
