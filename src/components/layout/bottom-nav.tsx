"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProjectsStore } from "@/stores/projects-store";
import { useNotesStore } from "@/stores/notes-store";
import { MODULES } from "./BottomDock";
import { IconDashboard } from "@/components/ui";

// ══════════════════════════════════════
// BottomNav — dock móvil (<1024px)
// Misma identidad visual e iconos que el BottomDock de escritorio:
// isla oscura flotante con los 7 módulos + avatar → /settings.
// ══════════════════════════════════════

interface BottomNavProps {
  userName?: string;
  avatarUrl?: string | null;
  initialProjectCount?: number;
  initialNoteCount?: number;
}

export function BottomNav({
  userName = "",
  avatarUrl = null,
  initialProjectCount = 0,
  initialNoteCount = 0,
}: BottomNavProps) {
  const pathname = usePathname();

  const storeProjectCount = useProjectsStore((s) =>
    s.initialized ? s.projects.filter((p) => p.status !== "archived").length : null
  );
  const storeNoteCount = useNotesStore((s) =>
    s.initialized ? s.notes.filter((n) => !n.archived).length : null
  );
  const projectCount = storeProjectCount ?? initialProjectCount;
  const noteCount = storeNoteCount ?? initialNoteCount;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const getCount = (key?: "proyectos" | "notas"): number | null => {
    if (key === "proyectos") return projectCount;
    if (key === "notas") return noteCount;
    return null;
  };

  // Mismo orden que el dock de escritorio, con Dashboard en el centro
  const left = [MODULES[0], MODULES[1], MODULES[4]];
  const right = [MODULES[2], MODULES[3], MODULES[5]];

  const renderModule = (mod: (typeof MODULES)[number]) => {
    const active = isActive(mod.href);
    const count = getCount(mod.countKey);
    const Icon = mod.Icon;
    return (
      <Link
        key={mod.key}
        href={mod.href}
        aria-label={mod.label}
        aria-current={active ? "page" : undefined}
        className="relative flex h-11 flex-1 flex-col items-center justify-center"
      >
        {count !== null && count > 0 && (
          <span
            style={{
              position: "absolute",
              top: 0,
              right: "50%",
              marginRight: -18,
              minWidth: 15,
              height: 15,
              background: "#D84040",
              border: "2px solid rgba(13,8,3,0.9)",
              borderRadius: 99,
              fontSize: 8,
              fontWeight: 700,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              zIndex: 2,
            }}
          >
            {count}
          </span>
        )}
        <span
          className="transition-transform duration-200"
          style={{
            transform: active ? "scale(1.12) translateY(-1px)" : undefined,
            transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
            display: "flex",
          }}
        >
          <span style={{ display: "flex" }}>
            <Icon size={28} />
          </span>
        </span>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 3,
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: mod.gradFrom,
            boxShadow: `0 0 8px ${mod.glow}`,
            opacity: active ? 1 : 0,
            transition: "opacity 0.2s",
          }}
        />
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-3 z-30 lg:hidden"
      style={{ bottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
    >
      <div
        className="flex items-center px-2 py-1.5"
        style={{
          background: "rgba(13,8,3,0.86)",
          backdropFilter: "blur(28px) saturate(1.8)",
          WebkitBackdropFilter: "blur(28px) saturate(1.8)",
          border: "1px solid rgba(196,112,74,0.14)",
          borderRadius: 20,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset",
          position: "relative",
        }}
      >
        {/* Shimmer superior — misma firma visual que el dock de escritorio */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -1,
            left: "8%",
            right: "8%",
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(196,112,74,0.55) 30%, rgba(230,196,120,0.7) 50%, rgba(196,112,74,0.55) 70%, transparent)",
            pointerEvents: "none",
          }}
        />

        {left.map(renderModule)}

        {/* Dashboard en el centro */}
        <Link
          href="/"
          aria-label="Dashboard"
          aria-current={isActive("/") ? "page" : undefined}
          className="relative flex h-11 flex-1 flex-col items-center justify-center"
        >
          <span
            className="transition-transform duration-200"
            style={{
              transform: isActive("/") ? "scale(1.12) translateY(-1px)" : undefined,
              transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
              display: "flex",
            }}
          >
            <IconDashboard size={28} />
          </span>
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 3,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#D4895E",
              boxShadow: "0 0 8px rgba(196,112,74,0.7)",
              opacity: isActive("/") ? 1 : 0,
              transition: "opacity 0.2s",
            }}
          />
        </Link>

        {right.map(renderModule)}

        {/* Perfil → ajustes */}
        <Link
          href="/settings"
          aria-label="Ajustes y perfil"
          aria-current={isActive("/settings") ? "page" : undefined}
          className="relative flex h-11 flex-1 flex-col items-center justify-center"
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: avatarUrl ? "transparent" : "linear-gradient(135deg, var(--accent-terracotta), #7a2030)",
              border: "1.5px solid rgba(196,112,74,0.4)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={userName || "Perfil"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>
                {(userName || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 3,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "var(--accent-terracotta)",
              boxShadow: "0 0 8px rgba(196,112,74,0.7)",
              opacity: isActive("/settings") ? 1 : 0,
              transition: "opacity 0.2s",
            }}
          />
        </Link>
      </div>
    </nav>
  );
}
