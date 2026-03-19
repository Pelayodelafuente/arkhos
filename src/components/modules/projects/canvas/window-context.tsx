'use client';

import { ArrowUpRight } from 'lucide-react';

// ─── Types ───────────────────────────

interface ContextItem {
  label: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  live?: boolean;
}

interface ContextSection {
  title: string;
  items: ContextItem[];
}

// ─── Data ────────────────────────────

const SECTIONS: ContextSection[] = [
  {
    title: 'Módulos',
    items: [
      {
        label: 'Proyectos',
        icon: 'P',
        iconBg: 'rgba(196,112,74,0.12)',
        iconColor: '#C4704A',
        live: true,
      },
      {
        label: 'Gastos',
        icon: 'G',
        iconBg: 'rgba(122,155,118,0.12)',
        iconColor: '#7a9b76',
      },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      {
        label: 'Claude Sonnet',
        icon: 'AI',
        iconBg: '#fce8d8',
        iconColor: '#C4704A',
      },
      {
        label: 'Engram MCP',
        icon: 'E',
        iconBg: '#1A1714',
        iconColor: '#FAF7F2',
      },
    ],
  },
];

// ─── Row component ───────────────────

function ContextRow({ item }: { item: ContextItem }) {
  return (
    <div
      className="group flex cursor-default items-center gap-[9px] rounded-md px-[6px] py-[5px] transition-colors duration-150"
      style={{}}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background =
          'rgba(196,112,74,0.07)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      {/* Icon */}
      <span
        className="relative flex h-[24px] w-[24px] shrink-0 items-center justify-center overflow-hidden rounded-[6px] text-[10px] font-bold transition-transform duration-150 group-hover:scale-110"
        style={{
          background: item.iconBg,
          border: '0.5px solid #E2D9CA',
          color: item.iconColor,
        }}
      >
        {/* Main icon text */}
        <span className="transition-opacity duration-150 group-hover:opacity-0">
          {item.icon}
        </span>
        {/* Arrow on hover */}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <ArrowUpRight
            className="h-[12px] w-[12px] group-hover:animate-[bounceUpRight_0.55s_ease-in-out_infinite]"
            style={{ color: item.iconColor }}
          />
        </span>
      </span>

      {/* Label */}
      <span className="ctx-label text-[11px] text-[#5a4a4a] transition-all duration-150 group-hover:bg-[length:300%] group-hover:bg-clip-text group-hover:[-webkit-text-fill-color:transparent] group-hover:bg-[linear-gradient(90deg,#5a4a4a_20%,#C4704A_50%,#5a4a4a_80%)] group-hover:animate-[shimmer_1.1s_ease_infinite]">
        {item.label}
      </span>

      {/* Live dot */}
      {item.live && (
        <span
          className="ml-auto h-[6px] w-[6px] shrink-0 rounded-full"
          style={{
            background: '#7a9b76',
            boxShadow: '0 0 5px rgba(122,155,118,0.7)',
            animation: 'ctx-pulse 2s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );
}

// ─── Main component ──────────────────

export function WindowContext() {
  return (
    <div className="flex flex-col gap-3">
      {/* Keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes bounceUpRight {
          0%, 100% { transform: translate(-1px, 1px); }
          50% { transform: translate(1px, -1px); }
        }
        @keyframes ctx-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 5px rgba(122,155,118,0.7); }
          50% { opacity: 0.6; box-shadow: 0 0 8px rgba(122,155,118,0.9); }
        }
      `}</style>

      {SECTIONS.map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <span className="px-[6px] text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">
            {section.title}
          </span>
          {section.items.map((item) => (
            <ContextRow key={item.label} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
}
