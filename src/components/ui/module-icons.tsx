"use client";

import { useId } from "react";

// ══════════════════════════════════════
// Iconos de módulo estilo app real (mockup aprobado 2026-07-04:
// docs/mockups/arkhos-module-icons.html). Baldosa con gradiente del color
// del módulo (paleta Primary) + glifo facetado luz/sombra.
// Los ids de gradiente se generan con useId → varias instancias en la misma
// página no colisionan (los ids SVG son globales en el DOM).
// ══════════════════════════════════════

export interface ModuleIconProps {
  size?: number;
  className?: string;
}

interface TileColors {
  from: string;
  mid: string;
  to: string;
}

/** Baldosa + defs comunes de un icono. Devuelve los ids para las facetas. */
function useIconDefs(colors: TileColors) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return {
    tile: `t${uid}`,
    sheen: `s${uid}`,
    hi: `h${uid}`,
    mid: `m${uid}`,
    lo: `l${uid}`,
    defs: (
      <defs>
        <linearGradient id={`t${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={colors.from} />
          <stop offset=".5" stopColor={colors.mid} />
          <stop offset="1" stopColor={colors.to} />
        </linearGradient>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".32" />
          <stop offset=".45" stopColor="#fff" stopOpacity=".04" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`h${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity=".85" />
        </linearGradient>
        <linearGradient id={`m${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".72" />
          <stop offset="1" stopColor="#fff" stopOpacity=".55" />
        </linearGradient>
        <linearGradient id={`l${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".42" />
          <stop offset="1" stopColor="#fff" stopOpacity=".26" />
        </linearGradient>
      </defs>
    ),
  };
}

function Tile({ tile, sheen }: { tile: string; sheen: string }) {
  return (
    <>
      <rect width="112" height="112" rx="26" fill={`url(#${tile})`} />
      <rect width="112" height="112" rx="26" fill={`url(#${sheen})`} />
      <rect x=".75" y=".75" width="110.5" height="110.5" rx="25.25" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="1.5" />
    </>
  );
}

// ─── Dashboard · monograma «A» facetado ──────────────────────────────────────
export function IconDashboard({ size = 34, className }: ModuleIconProps) {
  const g = useIconDefs({ from: "#F09A5E", mid: "#D4703A", to: "#6E2B10" });
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" className={className} aria-hidden="true">
      {g.defs}
      <Tile tile={g.tile} sheen={g.sheen} />
      <polygon points="56,20 30,88 44,88 56,52" fill={`url(#${g.hi})`} />
      <polygon points="56,20 56,52 68,88 82,88" fill={`url(#${g.lo})`} />
      <polygon points="47,70 65,70 68,79 44,79" fill={`url(#${g.mid})`} />
      <circle cx="56" cy="33" r="3.6" fill="#fff" opacity=".95" />
    </svg>
  );
}

// ─── Proyectos · pila isométrica de tableros ─────────────────────────────────
export function IconProyectos({ size = 34, className }: ModuleIconProps) {
  const g = useIconDefs({ from: "#FFA061", mid: "#EB7D42", to: "#8A3A12" });
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" className={className} aria-hidden="true">
      {g.defs}
      <Tile tile={g.tile} sheen={g.sheen} />
      <polygon points="56,58 88,72 56,86 24,72" fill={`url(#${g.lo})`} />
      <polygon points="56,42 88,56 56,70 24,56" fill={`url(#${g.mid})`} />
      <polygon points="56,24 88,38 56,52 24,38" fill={`url(#${g.hi})`} />
      <path d="M47 38.5 l6 5 l12 -10" fill="none" stroke="#B9500F" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" opacity=".85" />
    </svg>
  );
}

// ─── Notas · página-gema con pliegue ─────────────────────────────────────────
export function IconNotas({ size = 34, className }: ModuleIconProps) {
  const g = useIconDefs({ from: "#F2C14E", mid: "#D79719", to: "#7A5300" });
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" className={className} aria-hidden="true">
      {g.defs}
      <Tile tile={g.tile} sheen={g.sheen} />
      <path d="M34 22 h32 l14 14 v54 h-46 z" fill={`url(#${g.mid})`} />
      <path d="M34 22 h32 v0 l-8 70 h-24 z" fill={`url(#${g.hi})`} />
      <path d="M66 22 l14 14 h-14 z" fill={`url(#${g.lo})`} />
      <path d="M66 22 l14 14 h-14 z" fill="#000" opacity=".08" />
      <rect x="42" y="48" width="28" height="4.5" rx="2.25" fill="#8A5F00" opacity=".55" />
      <rect x="42" y="59" width="21" height="4.5" rx="2.25" fill="#8A5F00" opacity=".45" />
      <rect x="42" y="70" width="25" height="4.5" rx="2.25" fill="#8A5F00" opacity=".35" />
    </svg>
  );
}

// ─── Gastos · moneda € biselada ──────────────────────────────────────────────
export function IconGastos({ size = 34, className }: ModuleIconProps) {
  const g = useIconDefs({ from: "#66A9DC", mid: "#3079B0", to: "#123B5E" });
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" className={className} aria-hidden="true">
      {g.defs}
      <Tile tile={g.tile} sheen={g.sheen} />
      <circle cx="56" cy="60" r="30" fill="#000" opacity=".22" />
      <circle cx="56" cy="55" r="30" fill={`url(#${g.mid})`} />
      <path d="M56 25 a30 30 0 0 1 30 30 l-7 0 a23 23 0 0 0 -23 -23 z" fill={`url(#${g.hi})`} />
      <path d="M56 85 a30 30 0 0 1 -30 -30 l7 0 a23 23 0 0 0 23 23 z" fill={`url(#${g.lo})`} />
      <text x="56" y="67" textAnchor="middle" fontFamily="'Plus Jakarta Sans',sans-serif" fontWeight="800" fontSize="36" fill="#0F3A5C">€</text>
      <rect x="36" y="47" width="18" height="4" rx="2" fill="#0F3A5C" opacity=".9" />
      <rect x="36" y="56" width="15" height="4" rx="2" fill="#0F3A5C" opacity=".9" />
    </svg>
  );
}

// ─── Patrimonio · escudo-caja fuerte ─────────────────────────────────────────
export function IconPatrimonio({ size = 34, className }: ModuleIconProps) {
  const g = useIconDefs({ from: "#5FBF8B", mid: "#329562", to: "#0C4A2C" });
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" className={className} aria-hidden="true">
      {g.defs}
      <Tile tile={g.tile} sheen={g.sheen} />
      <path d="M56 20 L86 32 v24 c0 18 -13 30 -30 36 V20 z" fill={`url(#${g.lo})`} />
      <path d="M56 20 L26 32 v24 c0 18 13 30 30 36 V20 z" fill={`url(#${g.hi})`} />
      <circle cx="56" cy="52" r="12.5" fill="none" stroke="#0B4227" strokeWidth="5" opacity=".8" />
      <circle cx="56" cy="52" r="3.4" fill="#0B4227" opacity=".8" />
      <g stroke="#0B4227" strokeWidth="3.4" strokeLinecap="round" opacity=".8">
        <line x1="56" y1="34.5" x2="56" y2="40" />
        <line x1="56" y1="64" x2="56" y2="69.5" />
        <line x1="38.5" y1="52" x2="44" y2="52" />
        <line x1="68" y1="52" x2="73.5" y2="52" />
      </g>
    </svg>
  );
}

// ─── Mercados · velas-cristal ascendentes ────────────────────────────────────
export function IconMercados({ size = 34, className }: ModuleIconProps) {
  const g = useIconDefs({ from: "#A79BE3", mid: "#7D71C1", to: "#352A70" });
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" className={className} aria-hidden="true">
      {g.defs}
      <Tile tile={g.tile} sheen={g.sheen} />
      <g>
        <polygon points="26,62 35,58 35,88 26,88" fill={`url(#${g.hi})`} />
        <polygon points="35,58 44,62 44,88 35,88" fill={`url(#${g.lo})`} />
        <line x1="35" y1="50" x2="35" y2="58" stroke="#fff" strokeOpacity=".75" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g>
        <polygon points="47,46 56,42 56,88 47,88" fill={`url(#${g.hi})`} />
        <polygon points="56,42 65,46 65,88 56,88" fill={`url(#${g.lo})`} />
        <line x1="56" y1="33" x2="56" y2="42" stroke="#fff" strokeOpacity=".75" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g>
        <polygon points="68,30 77,26 77,88 68,88" fill={`url(#${g.hi})`} />
        <polygon points="77,26 86,30 86,88 77,88" fill={`url(#${g.lo})`} />
        <line x1="77" y1="18" x2="77" y2="26" stroke="#fff" strokeOpacity=".75" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// ─── Cronos · reloj de arena en anillo orbital ───────────────────────────────
export function IconCronos({ size = 34, className }: ModuleIconProps) {
  const g = useIconDefs({ from: "#E39AA6", mid: "#C7707D", to: "#6E2130" });
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" className={className} aria-hidden="true">
      {g.defs}
      <Tile tile={g.tile} sheen={g.sheen} />
      <circle cx="56" cy="56" r="34" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="4" />
      <circle cx="56" cy="22" r="4" fill="#fff" opacity=".9" />
      <polygon points="40,34 72,34 56,56" fill={`url(#${g.hi})`} />
      <polygon points="40,78 72,78 56,56" fill={`url(#${g.lo})`} />
      <rect x="38" y="30" width="36" height="5" rx="2.5" fill={`url(#${g.mid})`} />
      <rect x="38" y="77" width="36" height="5" rx="2.5" fill={`url(#${g.mid})`} />
      <circle cx="56" cy="63" r="2" fill="#fff" opacity=".85" />
      <polygon points="50,74 62,74 56,66" fill="#fff" opacity=".85" />
    </svg>
  );
}

// ─── Sala OPS · núcleo hexagonal reactor ─────────────────────────────────────
export function IconSala({ size = 34, className }: ModuleIconProps) {
  const g = useIconDefs({ from: "#7FD2CE", mid: "#4CAEAA", to: "#0E4A48" });
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" className={className} aria-hidden="true">
      {g.defs}
      <Tile tile={g.tile} sheen={g.sheen} />
      <polygon points="56,20 85,38 85,74 56,92 27,74 27,38" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="4.5" strokeLinejoin="round" />
      <polygon points="56,38 72,48 72,64 56,74 40,64 40,48" fill={`url(#${g.hi})`} />
      <polygon points="56,38 72,48 72,64 56,74" fill="#000" opacity=".10" />
      <circle cx="56" cy="56" r="6.5" fill="#0B403E" />
      <circle cx="85" cy="38" r="3.2" fill="#fff" opacity=".9" />
      <circle cx="27" cy="74" r="3.2" fill="#fff" opacity=".6" />
    </svg>
  );
}

/** Mapa por clave de módulo (misma clave que MODULES del dock / rutas). */
export const MODULE_ICONS: Record<string, React.ComponentType<ModuleIconProps>> = {
  dashboard: IconDashboard,
  proyectos: IconProyectos,
  notas: IconNotas,
  gastos: IconGastos,
  patrimonio: IconPatrimonio,
  mercados: IconMercados,
  agenda: IconCronos,
  sala: IconSala,
};
