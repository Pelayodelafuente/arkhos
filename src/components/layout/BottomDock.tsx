"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProjectsStore } from "@/stores/projects-store";
import { useNotesStore } from "@/stores/notes-store";
import { logout } from "@/app/(auth)/actions";

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const SVG = {
  fill: "none" as const,
  stroke: "rgba(255,255,255,0.93)" as string,
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IcoDashboard() {
  const c = "#D4895E";
  return (
    <svg fill="none" width="26" height="26" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill={c} />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill={c} />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill={c} />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill={c} />
    </svg>
  );
}
function IcoProyectos() {
  const c = "#E07848";
  return (
    <svg fill="none" width="34" height="34" viewBox="0 0 24 24">
      <path
        d="M2 9.5C2 8.4 2.9 7.5 4 7.5h4.6l1.9 2.2H20a2 2 0 012 2V19a2 2 0 01-2 2H4a2 2 0 01-2-2V9.5z"
        fill={c} fillOpacity="0.18"
      />
      <rect x="5.5" y="13.5" width="3" height="5.5" rx="1" fill={c} />
      <rect x="10.5" y="11" width="3" height="8" rx="1" fill={c} />
      <rect x="15.5" y="15.5" width="3" height="3.5" rx="1" fill={c} />
    </svg>
  );
}
function IcoNotas() {
  const c = "#CC9040";
  return (
    <svg fill="none" width="34" height="34" viewBox="0 0 24 24">
      <path d="M12 5.5C9.5 4.7 6 5 3.5 5.8v13C6 18 9.5 18.2 12 19V5.5z" fill={c} fillOpacity="0.22" />
      <path d="M12 5.5c2.5-.8 6-.5 8.5.3v13c-2.5-.8-6-1-8.5-.3V5.5z" fill={c} fillOpacity="0.14" />
      <rect x="11.5" y="5.5" width="1" height="13.5" rx="0.5" fill={c} fillOpacity="0.7" />
      <rect x="5" y="9" width="5" height="1.2" rx="0.6" fill={c} />
      <rect x="5" y="11.8" width="4" height="1.2" rx="0.6" fill={c} />
      <rect x="5" y="14.6" width="4.5" height="1.2" rx="0.6" fill={c} />
      <rect x="13.5" y="9" width="5" height="1.2" rx="0.6" fill={c} fillOpacity="0.7" />
      <rect x="13.5" y="11.8" width="3.5" height="1.2" rx="0.6" fill={c} fillOpacity="0.7" />
      <rect x="13.5" y="14.6" width="4.5" height="1.2" rx="0.6" fill={c} fillOpacity="0.7" />
    </svg>
  );
}
function IcoMercados() {
  const c = "#9880E8";
  return (
    <svg fill="none" width="34" height="34" viewBox="0 0 24 24">
      {/* Candlestick 1 — left, bearish */}
      <line x1="5.5" y1="13.5" x2="5.5" y2="15" stroke={c} strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="3.5" y="15" width="4" height="4.5" rx="0.8" fill={c} fillOpacity="0.4" />
      <line x1="5.5" y1="19.5" x2="5.5" y2="21" stroke={c} strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" />
      {/* Candlestick 2 — center, neutral */}
      <line x1="12" y1="8.5" x2="12" y2="10.5" stroke={c} strokeOpacity="0.7" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="10" y="10.5" width="4" height="5" rx="0.8" fill={c} fillOpacity="0.65" />
      <line x1="12" y1="15.5" x2="12" y2="17.5" stroke={c} strokeOpacity="0.7" strokeWidth="1.2" strokeLinecap="round" />
      {/* Candlestick 3 — right, bullish */}
      <line x1="18.5" y1="4" x2="18.5" y2="6" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <rect x="16.5" y="6" width="4" height="5" rx="0.8" fill={c} />
      <line x1="18.5" y1="11" x2="18.5" y2="13" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function IcoPatrimonio() {
  const c = "#3AAA80";
  return (
    <svg fill="none" width="34" height="34" viewBox="0 0 24 24">
      <rect x="2" y="2.5" width="18" height="19" rx="2.5" fill={c} fillOpacity="0.18" />
      <rect x="20.5" y="8" width="1.5" height="8" rx="0.75" fill={c} fillOpacity="0.6" />
      <circle cx="11" cy="12" r="5.8" stroke={c} strokeWidth="1.8" />
      <circle cx="11" cy="12" r="3.4" fill={c} fillOpacity="0.18" />
      <line x1="11" y1="7" x2="11" y2="8.4" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="15" y1="9" x2="14" y2="9.9" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="15" y1="15" x2="14" y2="14.1" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="11" y1="17" x2="11" y2="15.6" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="7" y1="15" x2="8" y2="14.1" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="7" y1="9" x2="8" y2="9.9" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="11" cy="12" r="1.4" fill={c} />
      <line x1="11" y1="12" x2="13.4" y2="9.8" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="4.5" cy="5" r="0.9" fill={c} fillOpacity="0.5" />
      <circle cx="17.5" cy="5" r="0.9" fill={c} fillOpacity="0.5" />
      <circle cx="4.5" cy="19" r="0.9" fill={c} fillOpacity="0.5" />
      <circle cx="17.5" cy="19" r="0.9" fill={c} fillOpacity="0.5" />
    </svg>
  );
}
function IcoGastos() {
  const c = "#4A90CC";
  return (
    <svg fill="none" width="34" height="34" viewBox="0 0 24 24">
      <rect x="1" y="4.5" width="22" height="15" rx="2.5" fill={c} fillOpacity="0.2" />
      <rect x="1" y="4.5" width="22" height="4" rx="2.5" fill={c} fillOpacity="0.35" />
      <rect x="3.5" y="11" width="5" height="4" rx="1" fill={c} fillOpacity="0.7" />
      <line x1="6" y1="11" x2="6" y2="15" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
      <line x1="3.5" y1="13" x2="8.5" y2="13" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
      <path d="M18.5 10.5 Q20.5 11.5 20.5 13 Q20.5 14.5 18.5 15.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M16.8 11.5 Q18.2 12 18.2 13 Q18.2 14 16.8 14.5" stroke={c} strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="4" cy="17.5" r="0.9" fill={c} />
      <circle cx="6.5" cy="17.5" r="0.9" fill={c} />
      <circle cx="9" cy="17.5" r="0.9" fill={c} />
      <circle cx="11.5" cy="17.5" r="0.9" fill={c} />
      <rect x="15" y="16.8" width="7" height="1.5" rx="0.75" fill={c} fillOpacity="0.5" />
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

function IcoHeimer() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/heimerdinguer.jpg"
      alt="Heimer"
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
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
  previewFeatures: string[];
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
    previewFeatures: ["Kanban", "Fases", "Tareas", "Links"],
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
    previewSub: "Texto y canvas",
    previewFeatures: ["Rich text", "Canvas", "IA", "Imágenes"],
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
    previewFeatures: ["Crypto", "Índices", "Forex", "Macro"],
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
    previewFeatures: ["Cartera", "Cripto", "Fondos", "Cash"],
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
    previewFeatures: ["Suscripciones", "Historial", "Tags", "Ciclos"],
    Icon: IcoGastos,
  },
];

// ─── AppIcon shell ────────────────────────────────────────────────────────────

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
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
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

// ─── DockSep ──────────────────────────────────────────────────────────────────

function DockSep() {
  return (
    <div style={{
      width: 1, height: 34,
      background: "rgba(255,255,255,0.07)",
      borderRadius: 1,
      alignSelf: "center",
      flexShrink: 0,
      margin: "0 4px",
    }} />
  );
}

// ─── PreviewCard ──────────────────────────────────────────────────────────────

interface PreviewCardProps {
  visible: boolean;
  children: React.ReactNode;
  wide?: boolean;
}

function PreviewCard({ visible, children, wide = false }: PreviewCardProps) {
  return (
    <div style={{
      position: "absolute",
      bottom: "calc(100% + 12px)",
      left: "50%",
      width: wide ? 216 : 196,
      background: "rgba(10,6,2,0.93)",
      backdropFilter: "blur(24px) saturate(1.4)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 16,
      padding: "12px 14px 12px",
      pointerEvents: visible ? "auto" : "none",
      zIndex: 100,
      boxShadow: "0 8px 36px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05) inset",
      opacity: visible ? 1 : 0,
      transform: `translateX(-50%) translateY(${visible ? "0px" : "6px"})`,
      transition: "opacity 0.18s ease, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      <div style={{
        position: "absolute", top: "100%", left: "50%",
        transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderTop: "5px solid rgba(255,255,255,0.07)",
      }} />
      {children}
    </div>
  );
}

function PreviewHeader({ icon, name, sub, iconBg }: { icon: React.ReactNode; name: string; sub: string; iconBg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9,
        background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
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
    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
      {chips.map(({ val, lbl, color }) => (
        <div key={lbl} style={{
          flex: 1, padding: "6px 8px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 8, textAlign: "center",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: color ?? "rgba(255,255,255,0.8)" }}>{val}</div>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{lbl}</div>
        </div>
      ))}
    </div>
  );
}

function PreviewTags({ tags, accent }: { tags: string[]; accent: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {tags.map((t) => (
        <span key={t} style={{
          fontSize: 10, padding: "3px 8px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 6,
          color: "rgba(255,255,255,0.45)",
          fontFamily: "monospace",
        }}>
          {t}
        </span>
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

  const storeProjectCount = useProjectsStore((s) =>
    s.initialized ? s.projects.filter((p) => p.status !== "archived").length : null
  );
  const storeNoteCount = useNotesStore((s) =>
    s.initialized ? s.notes.filter((n) => !n.archived).length : null
  );
  const projectCount = storeProjectCount ?? initialProjectCount;
  const noteCount = storeNoteCount ?? initialNoteCount;

  const [dockVisible, setDockVisible] = useState(true);
  useEffect(() => {
    try {
      // Version bump: reset old hidden state so dock is always recoverable
      if (localStorage.getItem("arkhos-dock-v") !== "2") {
        localStorage.setItem("arkhos-dock-v", "2");
        localStorage.setItem("arkhos-dock-visible", "true");
        setDockVisible(true);
        return;
      }
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

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

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
        const s = 1 + 0.22 * Math.pow(t, 1.6);
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

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const getCount = (key?: "proyectos" | "notas"): number | null => {
    if (key === "proyectos") return projectCount;
    if (key === "notas") return noteCount;
    return null;
  };

  let refIdx = 0;
  const nextRefIdx = () => refIdx++;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Keyframes for Heimer pulse animation */}
      <style>{`
        @keyframes heimer-pulse {
          0%, 100% { box-shadow: 0 4px 22px rgba(240,168,85,0.45), 0 0 0 0 rgba(240,168,85,0.2), 0 1px 0 rgba(255,255,255,0.12) inset; }
          50%       { box-shadow: 0 6px 34px rgba(240,168,85,0.65), 0 0 0 10px rgba(240,168,85,0), 0 1px 0 rgba(255,255,255,0.12) inset; }
        }
        @keyframes heimer-dot-pulse {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
      `}</style>

      {/* ── Handle — always fixed at bottom:16, z=41 ── */}
      <button
        type="button"
        onClick={toggleDock}
        title={dockVisible ? "Ocultar dock" : "Mostrar dock"}
        className="fixed hidden lg:flex items-center gap-2"
        style={{
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 41,
          padding: "4px 18px",
          background: "rgba(16,10,5,0.80)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(196,112,74,0.16)",
          borderRadius: 12,
          cursor: "pointer",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(24,15,7,0.92)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(16,10,5,0.80)"; }}
      >
        <div style={{ width: 22, height: 3, borderRadius: 99, background: "rgba(255,255,255,0.18)" }} />
        <svg
          width={13} height={13} viewBox="0 0 16 16"
          fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={2} strokeLinecap="round"
          style={{
            transform: dockVisible ? "rotate(0deg)" : "rotate(180deg)",
            transition: "transform 0.38s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <polyline points="4,10 8,6 12,10" />
        </svg>
        <div style={{ width: 22, height: 3, borderRadius: 99, background: "rgba(255,255,255,0.18)" }} />
      </button>

      {/* ── Dock bar — positioned above the handle, animates down when hidden ── */}
      <div
        className="fixed hidden lg:flex items-end"
        style={{
          bottom: 56,
          left: "50%",
          zIndex: 40,
          transform: `translateX(-50%) translateY(${dockVisible ? "0px" : "calc(100% + 70px)"})`,
          transition: "transform 0.42s cubic-bezier(0.34,1.56,0.64,1)",
          willChange: "transform",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 14,
            padding: "14px 22px 18px",
            background: "rgba(13,8,3,0.82)",
            backdropFilter: "blur(32px) saturate(1.8)",
            border: "1px solid rgba(196,112,74,0.14)",
            borderRadius: 22,
            boxShadow: "0 8px 40px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.05) inset",
            position: "relative",
          }}
        >
          {/* Shimmer top border */}
          <div style={{
            position: "absolute", top: -1, left: "8%", right: "8%", height: 1,
            background: "linear-gradient(90deg, transparent, rgba(196,112,74,0.55) 30%, rgba(230,196,120,0.7) 50%, rgba(196,112,74,0.55) 70%, transparent)",
            pointerEvents: "none",
          }} />


          {/* ── Izquierda: Proyectos · Notas · Gastos ───────────────── */}
          {[MODULES[0], MODULES[1], MODULES[4]].map((mod) => {
            const active = isActive(mod.href);
            const count = getCount(mod.countKey);
            const Icon = mod.Icon;
            const ri = nextRefIdx();
            return (
              <div key={mod.key}
                style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", flexShrink: 0 }}
                onMouseEnter={() => setHoveredKey(mod.key)} onMouseLeave={() => setHoveredKey(null)}>
                <Link href={mod.href} style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  {count !== null && count > 0 && (
                    <div style={{ position: "absolute", top: -4, right: -4, minWidth: 17, height: 17, background: "#D84040", border: "2px solid rgba(13,8,3,0.9)", borderRadius: 99, fontSize: 9, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", zIndex: 2, boxShadow: "0 1px 4px rgba(216,64,64,0.5)" }}>
                      {count}
                    </div>
                  )}
                  <div ref={(el) => { iconRefs.current[ri] = el; if (el) el.dataset.glow = mod.glow; }}
                    style={{ width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s", willChange: "transform" }}>
                    <Icon />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 500, color: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.42)", transition: "color 0.2s", whiteSpace: "nowrap" }}>{mod.label}</span>
                  <span style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: mod.gradFrom, boxShadow: `0 0 8px ${mod.glow}`, opacity: active ? 1 : 0, transition: "opacity 0.2s" }} />
                </Link>
                <PreviewCard visible={hoveredKey === mod.key}>
                  <PreviewHeader icon={<Icon />} name={mod.label} sub={mod.previewSub} iconBg={mod.previewBg} />
                  {count !== null && <PreviewChips chips={[{ val: String(count), lbl: mod.key === "proyectos" ? "Activos" : "Total", color: mod.gradFrom }, { val: "→", lbl: "Abrir" }]} />}
                  <PreviewTags tags={mod.previewFeatures} accent={mod.gradFrom} />
                </PreviewCard>
              </div>
            );
          })}

          <DockSep />

          {/* ── Centro: Dashboard · Heimer ──────────────────────────── */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", flexShrink: 0 }}
            onMouseEnter={() => setHoveredKey("dashboard")} onMouseLeave={() => setHoveredKey(null)}>
            <Link href="/" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div ref={setIconRef(nextRefIdx())} style={{ width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s", willChange: "transform" }}>
                <IcoDashboard />
              </div>
              <span style={{ fontSize: 10, fontWeight: 500, color: isActive("/") ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.42)", transition: "color 0.2s", whiteSpace: "nowrap" }}>Dashboard</span>
              <span style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: "#D4895E", boxShadow: "0 0 8px rgba(196,112,74,0.7)", opacity: isActive("/") ? 1 : 0, transition: "opacity 0.2s" }} />
            </Link>
            <PreviewCard visible={hoveredKey === "dashboard"}>
              <PreviewHeader icon={<IcoDashboard />} name="Dashboard" sub="Centro de control" iconBg="rgba(196,112,74,0.25)" />
              <PreviewChips chips={[{ val: "5", lbl: "Módulos" }, { val: String(projectCount), lbl: "Proyectos" }, { val: String(noteCount), lbl: "Notas" }]} />
              <PreviewTags tags={["Resumen", "Actividad", "Métricas"]} accent="#D4895E" />
            </PreviewCard>
          </div>

          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}
            onMouseEnter={() => setHoveredKey("heimer")} onMouseLeave={() => setHoveredKey(null)}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "radial-gradient(ellipse at 38% 28%, #F0C055, #7B3E00)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: "heimer-pulse 2.8s ease-in-out infinite", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg, rgba(255,255,255,0.22), transparent)", borderRadius: "50% 50% 0 0", pointerEvents: "none" }} />
                <div style={{ position: "relative", zIndex: 1 }}><IcoHeimer /></div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,210,100,0.8)", whiteSpace: "nowrap", letterSpacing: "0.03em" }}>Heimer</span>
            </div>
            <PreviewCard visible={hoveredKey === "heimer"} wide>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "radial-gradient(ellipse at 38% 28%, #F0C055, #7B3E00)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 12px rgba(240,168,85,0.4)" }}>
                  <IcoHeimer />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,210,100,0.95)" }}>Heimer</div>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.33)", textTransform: "uppercase", letterSpacing: "0.07em" }}>IA Personal</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", background: "rgba(240,168,85,0.07)", border: "1px solid rgba(240,168,85,0.16)", borderRadius: 9, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F0A855", boxShadow: "0 0 7px rgba(240,168,85,0.8)", flexShrink: 0, animation: "heimer-dot-pulse 2s ease-in-out infinite" }} />
                <span style={{ fontSize: 11, color: "rgba(240,168,85,0.8)", fontWeight: 500 }}>Conectándose al VPS…</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", textAlign: "center", lineHeight: 1.55 }}>
                Tu asistente IA personal.<br />Integración en desarrollo.
              </div>
            </PreviewCard>
          </div>

          <DockSep />

          {/* ── Derecha: Mercados · Patrimonio ──────────────────────── */}
          {[MODULES[2], MODULES[3]].map((mod) => {
            const active = isActive(mod.href);
            const count = getCount(mod.countKey);
            const Icon = mod.Icon;
            const ri = nextRefIdx();
            return (
              <div key={mod.key}
                style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", flexShrink: 0 }}
                onMouseEnter={() => setHoveredKey(mod.key)} onMouseLeave={() => setHoveredKey(null)}>
                <Link href={mod.href} style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div ref={(el) => { iconRefs.current[ri] = el; if (el) el.dataset.glow = mod.glow; }}
                    style={{ width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s", willChange: "transform" }}>
                    <Icon />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 500, color: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.42)", transition: "color 0.2s", whiteSpace: "nowrap" }}>{mod.label}</span>
                  <span style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: mod.gradFrom, boxShadow: `0 0 8px ${mod.glow}`, opacity: active ? 1 : 0, transition: "opacity 0.2s" }} />
                </Link>
                <PreviewCard visible={hoveredKey === mod.key}>
                  <PreviewHeader icon={<Icon />} name={mod.label} sub={mod.previewSub} iconBg={mod.previewBg} />
                  <PreviewTags tags={mod.previewFeatures} accent={mod.gradFrom} />
                </PreviewCard>
              </div>
            );
          })}

          <DockSep />

          {/* ── Profile ──────────────────────────────────────────────── */}
          <div
            style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", flexShrink: 0 }}
            onMouseEnter={() => setHoveredKey("profile")}
            onMouseLeave={() => setHoveredKey(null)}
          >
            <div
              ref={setIconRef(nextRefIdx())}
              style={{
                width: 44, height: 44, borderRadius: "50%",
                background: avatarUrl ? "transparent" : "linear-gradient(135deg, #C4704A, #7a2030)",
                border: "2px solid rgba(196,112,74,0.4)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 0 0 2px rgba(196,112,74,0.15)",
                overflow: "hidden", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
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
              <div style={{
                position: "absolute", bottom: 2, right: 2,
                width: 9, height: 9, borderRadius: "50%",
                background: "#3ecc6e", border: "2px solid rgba(13,8,3,0.9)",
                boxShadow: "0 0 5px rgba(62,204,110,0.6)",
              }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.42)", marginTop: 6, whiteSpace: "nowrap" }}>
              {userName.split(" ")[0]}
            </span>

            {/* Profile card */}
            <div style={{
              position: "absolute", bottom: "calc(100% + 12px)", left: "50%",
              width: 200,
              background: "rgba(10,6,2,0.93)",
              backdropFilter: "blur(24px) saturate(1.4)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 16, padding: "12px 14px 10px",
              zIndex: 100,
              boxShadow: "0 8px 36px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05) inset",
              opacity: hoveredKey === "profile" ? 1 : 0,
              transform: `translateX(-50%) translateY(${hoveredKey === "profile" ? "0px" : "6px"})`,
              transition: "opacity 0.18s ease, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
              pointerEvents: hoveredKey === "profile" ? "auto" : "none",
            }}>
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

              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", background: "rgba(62,204,110,0.06)", border: "1px solid rgba(62,204,110,0.14)", borderRadius: 9, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3ecc6e", boxShadow: "0 0 5px rgba(62,204,110,0.7)", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "rgba(62,204,110,0.8)", fontWeight: 500 }}>Sesión activa</span>
              </div>

              <Link
                href="/settings"
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "7px 10px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 9, color: "rgba(255,255,255,0.5)",
                  fontSize: 12, textDecoration: "none",
                  marginBottom: 6,
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,0.08)"; el.style.color = "rgba(255,255,255,0.8)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,0.04)"; el.style.color = "rgba(255,255,255,0.5)"; }}
              >
                <IcoSettings />
                Configuración
              </Link>

              <form action={logout}>
                <button
                  type="submit"
                  style={{
                    width: "100%", padding: "7px 10px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 9, color: "rgba(255,255,255,0.4)",
                    fontSize: 12, cursor: "pointer",
                    transition: "background 0.15s, color 0.15s, border-color 0.15s",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(220,60,60,0.1)"; b.style.borderColor = "rgba(220,60,60,0.25)"; b.style.color = "rgba(255,130,130,0.7)"; }}
                  onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(255,255,255,0.04)"; b.style.borderColor = "rgba(255,255,255,0.09)"; b.style.color = "rgba(255,255,255,0.4)"; }}
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
