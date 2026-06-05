"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProjectsStore } from "@/stores/projects-store";
import { useNotesStore } from "@/stores/notes-store";
import { logout } from "@/app/(auth)/actions";

// ─── SVG Icon Components ──────────────────────────────────────────────────────

const SVG = {
  fill: "none" as const,
  stroke: "rgba(255,255,255,0.93)" as string,
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IcoDashboard() {
  return (
    <svg {...SVG} width={30} height={30} viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IcoProyectos() {
  return (
    <svg {...SVG} width={26} height={26} viewBox="0 0 24 24">
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      <line x1="8" y1="13" x2="8" y2="17" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="16" y1="9" x2="16" y2="17" />
    </svg>
  );
}
function IcoNotas() {
  return (
    <svg {...SVG} width={26} height={26} viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}
function IcoMercados() {
  return (
    <svg {...SVG} width={26} height={26} viewBox="0 0 24 24">
      <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
      <polyline points="16,7 22,7 22,13" />
    </svg>
  );
}
function IcoPatrimonio() {
  return (
    <svg {...SVG} width={26} height={26} viewBox="0 0 24 24">
      <path d="M12 2L3 7v5c0 5.25 3.9 10.17 9 11.38C17.1 22.17 21 17.25 21 12V7z" />
      <polyline points="8,12 11,15 16,10" />
    </svg>
  );
}
function IcoGastos() {
  return (
    <svg {...SVG} width={26} height={26} viewBox="0 0 24 24">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
      <circle cx="7" cy="15" r="1.5" fill="rgba(255,255,255,0.7)" stroke="none" />
      <line x1="12" y1="14" x2="18" y2="14" strokeWidth={2.5} />
      <line x1="12" y1="17" x2="15" y2="17" strokeWidth={2} />
    </svg>
  );
}
function IcoSettings() {
  return (
    <svg {...SVG} width={20} height={20} viewBox="0 0 24 24" stroke="rgba(255,255,255,0.55)">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
function IcoArkhosLogo() {
  return (
    <svg fill="none" stroke="rgba(230,180,120,0.88)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={22} height={22} viewBox="0 0 24 24">
      <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="8" x2="22" y2="8" />
      <line x1="2" y1="16" x2="22" y2="16" />
    </svg>
  );
}

// ─── Module config ────────────────────────────────────────────────────────────

interface ModuleConfig {
  key: string;
  label: string;
  href: string;
  gradFrom: string;
  gradTo: string;
  glow: string;
  previewBg: string;
  countKey?: "proyectos" | "notas";
  previewSub: string;
  Icon: React.ComponentType;
}

const MODULES: ModuleConfig[] = [
  {
    key: "proyectos",
    label: "Proyectos",
    href: "/proyectos",
    gradFrom: "#E07848",
    gradTo: "#6B2A0C",
    glow: "rgba(196,112,74,0.4)",
    previewBg: "rgba(196,112,74,0.22)",
    countKey: "proyectos",
    previewSub: "Gestión y kanban",
    Icon: IcoProyectos,
  },
  {
    key: "notas",
    label: "Notas",
    href: "/notas",
    gradFrom: "#CC9040",
    gradTo: "#6B4010",
    glow: "rgba(176,122,58,0.4)",
    previewBg: "rgba(176,122,58,0.22)",
    countKey: "notas",
    previewSub: "Texto y canvas",
    Icon: IcoNotas,
  },
  {
    key: "mercados",
    label: "Mercados",
    href: "/mercados",
    gradFrom: "#8870D8",
    gradTo: "#36218C",
    glow: "rgba(114,96,196,0.4)",
    previewBg: "rgba(114,96,196,0.22)",
    previewSub: "Datos en tiempo real",
    Icon: IcoMercados,
  },
  {
    key: "patrimonio",
    label: "Patrimonio",
    href: "/patrimonio",
    gradFrom: "#3AAA80",
    gradTo: "#0D4830",
    glow: "rgba(46,125,107,0.4)",
    previewBg: "rgba(46,125,107,0.22)",
    previewSub: "Inversiones y activos",
    Icon: IcoPatrimonio,
  },
  {
    key: "gastos",
    label: "Gastos",
    href: "/gastos",
    gradFrom: "#4A90CC",
    gradTo: "#0C3060",
    glow: "rgba(59,120,176,0.4)",
    previewBg: "rgba(59,120,176,0.22)",
    previewSub: "Control financiero",
    Icon: IcoGastos,
  },
];

// ─── App Icon shell ───────────────────────────────────────────────────────────

interface AppIconProps {
  size: number;
  gradFrom: string;
  gradTo: string;
  glow: string;
  children: React.ReactNode;
  iconRef?: (el: HTMLDivElement | null) => void;
}

function AppIcon({ size, gradFrom, gradTo, glow, children, iconRef }: AppIconProps) {
  const radius = size >= 60 ? 18 : 14;
  return (
    <div
      ref={iconRef}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `radial-gradient(ellipse at 40% 25%, ${gradFrom}, ${gradTo})`,
        boxShadow: `0 4px 18px ${glow}, 0 1px 0 rgba(255,255,255,0.12) inset`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s",
        willChange: "transform",
      }}
    >
      {/* Gloss highlight */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.17), transparent)",
          borderRadius: `${radius}px ${radius}px 0 0`,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

// ─── Separator ────────────────────────────────────────────────────────────────

function DockSep() {
  return (
    <div
      style={{
        width: 1,
        height: 34,
        background: "rgba(255,255,255,0.07)",
        borderRadius: 1,
        alignSelf: "center",
        flexShrink: 0,
        margin: "0 4px",
      }}
    />
  );
}

// ─── Preview Card ─────────────────────────────────────────────────────────────

interface PreviewCardProps {
  visible: boolean;
  children: React.ReactNode;
  wide?: boolean;
}

function PreviewCard({ visible, children, wide = false }: PreviewCardProps) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 12px)",
        left: "50%",
        width: wide ? 210 : 192,
        background: "rgba(10,6,2,0.93)",
        backdropFilter: "blur(24px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 16,
        padding: "12px 14px 10px",
        pointerEvents: visible ? "auto" : "none",
        zIndex: 100,
        boxShadow: "0 8px 36px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05) inset",
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? "0px" : "6px"})`,
        transition: "opacity 0.18s ease, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      {/* Arrow */}
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "5px solid rgba(255,255,255,0.07)",
        }}
      />
      {children}
    </div>
  );
}

function PreviewHeader({ icon, name, sub, iconBg }: { icon: React.ReactNode; name: string; sub: string; iconBg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{name}</div>
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.33)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{sub}</div>
      </div>
    </div>
  );
}

function PreviewChips({ chips }: { chips: { val: string; lbl: string; color?: string }[] }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {chips.map(({ val, lbl, color }) => (
        <div
          key={lbl}
          style={{
            flex: 1,
            padding: "6px 8px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: color ?? "rgba(255,255,255,0.8)" }}>{val}</div>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{lbl}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BottomDockProps {
  userName: string;
  avatarUrl?: string | null;
  initialProjectCount?: number;
  initialNoteCount?: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BottomDock({
  userName,
  avatarUrl,
  initialProjectCount = 0,
  initialNoteCount = 0,
}: BottomDockProps) {
  const pathname = usePathname();

  // Real-time counts from stores
  const storeProjectCount = useProjectsStore((s) =>
    s.initialized ? s.projects.filter((p) => p.status === "active").length : null
  );
  const storeNoteCount = useNotesStore((s) =>
    s.initialized ? s.notes.filter((n) => !n.archived).length : null
  );
  const projectCount = storeProjectCount ?? initialProjectCount;
  const noteCount = storeNoteCount ?? initialNoteCount;

  // Dock visibility (persisted)
  const [dockVisible, setDockVisible] = useState(true);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("arkhos-dock-visible");
      if (saved !== null) setDockVisible(JSON.parse(saved) as boolean);
    } catch { /* ignore */ }
  }, []);

  const toggleDock = () => {
    setDockVisible((prev) => {
      const next = !prev;
      try { localStorage.setItem("arkhos-dock-visible", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Hovered item key for preview cards
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Magnification — refs point to the .app-icon divs
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const setIconRef = (i: number) => (el: HTMLDivElement | null) => {
    iconRefs.current[i] = el;
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const mouseX = e.clientX;
    iconRefs.current.forEach((el) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const dist = Math.abs(mouseX - cx);
      const R = 110;
      if (dist < R) {
        const t = 1 - dist / R;
        const s = 1 + 0.26 * Math.pow(t, 1.6);
        const lift = (s - 1) * 16;
        el.style.transform = `scale(${s.toFixed(3)}) translateY(-${lift.toFixed(1)}px)`;
        el.style.boxShadow = `0 ${4 + lift}px ${18 + lift * 2}px ${el.dataset.glow ?? "rgba(0,0,0,0.4)"}, 0 1px 0 rgba(255,255,255,0.12) inset`;
      } else {
        el.style.transform = "";
        el.style.boxShadow = "";
      }
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    iconRefs.current.forEach((el) => {
      if (!el) return;
      el.style.transform = "";
      el.style.boxShadow = "";
    });
    setHoveredKey(null);
  }, []);

  // Active route detection
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Count lookup
  const getCount = (key?: "proyectos" | "notas"): number | null => {
    if (key === "proyectos") return projectCount;
    if (key === "notas") return noteCount;
    return null;
  };

  // Ref index tracker
  let refIdx = 0;
  const nextRefIdx = () => refIdx++;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed bottom-0 left-1/2 z-40 hidden flex-col items-center lg:flex"
      style={{
        transform: `translateX(-50%) translateY(${dockVisible ? "0px" : "calc(100% - 28px)"})`,
        transition: "transform 0.42s cubic-bezier(0.34,1.56,0.64,1)",
        willChange: "transform",
      }}
    >
      {/* ── Handle ──────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={toggleDock}
        title={dockVisible ? "Ocultar dock" : "Mostrar dock"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 20px 4px",
          marginBottom: -1,
          background: "rgba(16,10,5,0.80)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(196,112,74,0.16)",
          borderBottom: "none",
          borderRadius: "12px 12px 0 0",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(24,15,7,0.92)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(16,10,5,0.80)"; }}
      >
        <div style={{ width: 22, height: 3, borderRadius: 99, background: "rgba(255,255,255,0.18)" }} />
        <svg
          width={13}
          height={13}
          viewBox="0 0 16 16"
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth={2}
          strokeLinecap="round"
          style={{
            transform: dockVisible ? "rotate(0deg)" : "rotate(180deg)",
            transition: "transform 0.38s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <polyline points="4,10 8,6 12,10" />
        </svg>
        <div style={{ width: 22, height: 3, borderRadius: 99, background: "rgba(255,255,255,0.18)" }} />
      </button>

      {/* ── Dock bar ────────────────────────────────────────────────────── */}
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          padding: "12px 18px 16px",
          background: "rgba(13,8,3,0.82)",
          backdropFilter: "blur(32px) saturate(1.8)",
          borderTop: "1px solid rgba(196,112,74,0.15)",
          borderLeft: "1px solid rgba(255,255,255,0.05)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "0 0 20px 20px",
          boxShadow: "0 -1px 0 rgba(255,255,255,0.04) inset, 0 -24px 48px rgba(0,0,0,0.2)",
          position: "relative",
        }}
      >
        {/* Shimmer top border */}
        <div
          style={{
            position: "absolute",
            top: -1,
            left: "8%",
            right: "8%",
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(196,112,74,0.55) 30%, rgba(230,196,120,0.7) 50%, rgba(196,112,74,0.55) 70%, transparent)",
            pointerEvents: "none",
          }}
        />

        {/* ── Arkhos Logo ────────────────────────────────────────────── */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "radial-gradient(ellipse at 40% 30%, rgba(196,112,74,0.38), rgba(80,20,10,0.55))",
            border: "1px solid rgba(196,112,74,0.28)",
            boxShadow: "0 0 20px rgba(196,112,74,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: "default",
            alignSelf: "center",
          }}
        >
          <IcoArkhosLogo />
        </div>

        <DockSep />

        {/* ── DASHBOARD — special ────────────────────────────────────── */}
        <div
          style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", flexShrink: 0 }}
          onMouseEnter={() => setHoveredKey("dashboard")}
          onMouseLeave={() => setHoveredKey(null)}
        >
          <Link href="/" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <AppIcon
              size={60}
              gradFrom="#D4895E"
              gradTo="#6B2010"
              glow="rgba(196,112,74,0.45)"
              iconRef={setIconRef(nextRefIdx())}
            >
              <IcoDashboard />
            </AppIcon>
            <span style={{ fontSize: 10, fontWeight: 500, color: isActive("/") ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.42)", transition: "color 0.2s", whiteSpace: "nowrap" }}>
              Dashboard
            </span>
            {/* Active dot */}
            <span style={{
              position: "absolute",
              bottom: -8,
              left: "50%",
              transform: "translateX(-50%)",
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#D4895E",
              boxShadow: "0 0 8px rgba(196,112,74,0.7)",
              opacity: isActive("/") ? 1 : 0,
              transition: "opacity 0.2s",
            }} />
          </Link>

          {/* Preview card */}
          <PreviewCard visible={hoveredKey === "dashboard"}>
            <PreviewHeader
              icon={<IcoDashboard />}
              name="Dashboard"
              sub="Centro de control"
              iconBg="rgba(196,112,74,0.25)"
            />
            <PreviewChips chips={[
              { val: "5", lbl: "Módulos" },
              { val: String(projectCount), lbl: "Proyectos" },
              { val: String(noteCount), lbl: "Notas" },
            ]} />
          </PreviewCard>
        </div>

        <DockSep />

        {/* ── Module items ────────────────────────────────────────────── */}
        {MODULES.map((mod) => {
          const active = isActive(mod.href);
          const count = getCount(mod.countKey);
          const Icon = mod.Icon;
          const ri = nextRefIdx();

          return (
            <div
              key={mod.key}
              style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", flexShrink: 0 }}
              onMouseEnter={() => setHoveredKey(mod.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <Link href={mod.href} style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                {/* Badge */}
                {count !== null && count > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      minWidth: 17,
                      height: 17,
                      background: "#D84040",
                      border: "2px solid rgba(13,8,3,0.9)",
                      borderRadius: 99,
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 3px",
                      zIndex: 2,
                      boxShadow: "0 1px 4px rgba(216,64,64,0.5)",
                    }}
                  >
                    {count}
                  </div>
                )}

                <AppIcon
                  size={52}
                  gradFrom={mod.gradFrom}
                  gradTo={mod.gradTo}
                  glow={mod.glow}
                  iconRef={(el) => {
                    iconRefs.current[ri] = el;
                    if (el) el.dataset.glow = mod.glow;
                  }}
                >
                  <Icon />
                </AppIcon>
                <span style={{ fontSize: 10, fontWeight: 500, color: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.42)", transition: "color 0.2s", whiteSpace: "nowrap" }}>
                  {mod.label}
                </span>
                {/* Active dot */}
                <span style={{
                  position: "absolute",
                  bottom: -8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: mod.gradFrom,
                  boxShadow: `0 0 8px ${mod.glow}`,
                  opacity: active ? 1 : 0,
                  transition: "opacity 0.2s",
                }} />
              </Link>

              {/* Preview card */}
              <PreviewCard visible={hoveredKey === mod.key}>
                <PreviewHeader
                  icon={<Icon />}
                  name={mod.label}
                  sub={mod.previewSub}
                  iconBg={mod.previewBg}
                />
                {count !== null ? (
                  <PreviewChips chips={[
                    { val: String(count), lbl: mod.key === "proyectos" ? "Activos" : "Total", color: mod.gradFrom },
                    { val: "→", lbl: "Abrir" },
                  ]} />
                ) : (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "4px 0" }}>
                    Click para acceder
                  </div>
                )}
              </PreviewCard>
            </div>
          );
        })}

        <DockSep />

        {/* ── Settings ────────────────────────────────────────────────── */}
        <div
          style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", flexShrink: 0, alignSelf: "center" }}
          onMouseEnter={() => setHoveredKey("settings")}
          onMouseLeave={() => setHoveredKey(null)}
        >
          <Link href="/settings" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div
              ref={setIconRef(nextRefIdx())}
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: isActive("/settings") ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${isActive("/settings") ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                willChange: "transform",
              }}
            >
              <IcoSettings />
            </div>
          </Link>
        </div>

        <DockSep />

        {/* ── Profile ─────────────────────────────────────────────────── */}
        <div
          style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", flexShrink: 0 }}
          onMouseEnter={() => setHoveredKey("profile")}
          onMouseLeave={() => setHoveredKey(null)}
        >
          {/* Avatar */}
          <div
            ref={setIconRef(nextRefIdx())}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: avatarUrl ? "transparent" : "linear-gradient(135deg, #C4704A, #7a2030)",
              border: "2px solid rgba(196,112,74,0.4)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 0 0 2px rgba(196,112,74,0.15)",
              overflow: "hidden",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              willChange: "transform",
              transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
              position: "relative",
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
                {userName.charAt(0).toUpperCase()}
              </span>
            )}
            {/* Online dot */}
            <div style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#3ecc6e",
              border: "2px solid rgba(13,8,3,0.9)",
              boxShadow: "0 0 5px rgba(62,204,110,0.6)",
            }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.42)", marginTop: 6, whiteSpace: "nowrap" }}>
            {userName.split(" ")[0]}
          </span>

          {/* Profile preview card — interactive */}
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 12px)",
              left: "50%",
              width: 200,
              background: "rgba(10,6,2,0.93)",
              backdropFilter: "blur(24px) saturate(1.4)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 16,
              padding: "12px 14px 10px",
              zIndex: 100,
              boxShadow: "0 8px 36px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05) inset",
              opacity: hoveredKey === "profile" ? 1 : 0,
              transform: `translateX(-50%) translateY(${hoveredKey === "profile" ? "0px" : "6px"})`,
              transition: "opacity 0.18s ease, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
              pointerEvents: hoveredKey === "profile" ? "auto" : "none",
            }}
          >
            <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid rgba(255,255,255,0.07)" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: avatarUrl ? "transparent" : "linear-gradient(135deg, #C4704A, #7a2030)", border: "1px solid rgba(196,112,74,0.35)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{userName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{userName}</div>
                <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.33)", textTransform: "uppercase", letterSpacing: "0.07em" }}>workspace · admin</div>
              </div>
            </div>

            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", background: "rgba(62,204,110,0.06)", border: "1px solid rgba(62,204,110,0.14)", borderRadius: 9, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3ecc6e", boxShadow: "0 0 5px rgba(62,204,110,0.7)", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "rgba(62,204,110,0.8)", fontWeight: 500 }}>Sesión activa</span>
            </div>

            {/* Logout */}
            <form action={logout}>
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 9,
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s, border-color 0.15s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = "rgba(220,60,60,0.1)";
                  b.style.borderColor = "rgba(220,60,60,0.25)";
                  b.style.color = "rgba(255,130,130,0.7)";
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = "rgba(255,255,255,0.04)";
                  b.style.borderColor = "rgba(255,255,255,0.09)";
                  b.style.color = "rgba(255,255,255,0.4)";
                }}
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>

      </div>{/* /dock bar */}
    </div>
  );
}
