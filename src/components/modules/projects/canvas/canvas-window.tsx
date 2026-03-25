'use client';

import { useState } from 'react';
import { Minus, Maximize2 } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvas-store';

// ─── Types ───────────────────────────

interface CanvasWindowBadge {
  text: string;
  variant: 'terracotta' | 'green' | 'gray';
}

interface CanvasWindowProps {
  id: string;
  title: string;
  badge?: CanvasWindowBadge;
  children: React.ReactNode;
  className?: string;
}

// ─── Constants ───────────────────────

const BADGE_STYLES: Record<CanvasWindowBadge['variant'], { bg: string; color: string }> = {
  terracotta: { bg: 'rgba(196,112,74,0.12)', color: '#C4704A' },
  green: { bg: 'rgba(122,155,118,0.15)', color: '#4a7a46' },
  gray: { bg: 'rgba(154,122,90,0.12)', color: '#9a7a5a' },
};

// ─── Component ───────────────────────

export function CanvasWindow({
  id,
  title,
  badge,
  children,
  className = '',
}: CanvasWindowProps) {
  const minimizedWindows = useCanvasStore((s) => s.minimizedWindows);
  const toggleMinimized = useCanvasStore((s) => s.toggleMinimized);
  const isMinimized = minimizedWindows.has(id);

  const [titlebarHovered, setTitlebarHovered] = useState(false);

  const handleDoubleClick = () => {
    toggleMinimized(id);
  };

  return (
    <div
      className={`flex flex-col overflow-hidden ${className}`}
      style={{
        background: 'rgba(255,252,248,0.97)',
        border: '0.5px solid #E2D9CA',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)',
        transition: 'box-shadow 200ms ease',
      }}
    >
      {/* Titlebar */}
      <div
        className="flex items-center gap-2"
        style={{
          padding: '10px 12px 9px',
          borderBottom: isMinimized ? 'none' : '0.5px solid #EDE8E0',
          background: 'rgba(250,247,242,0.6)',
          borderRadius: isMinimized ? 14 : '14px 14px 0 0',
          cursor: 'default',
          userSelect: 'none',
        }}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setTitlebarHovered(true)}
        onMouseLeave={() => setTitlebarHovered(false)}
      >
        {/* Traffic light dots */}
        <div className="flex items-center gap-[5px]">
          <span
            className="block h-[10px] w-[10px] rounded-full"
            style={{
              background: '#FF5F57',
              border: '0.5px solid rgba(0,0,0,0.08)',
            }}
          />
          <span
            className="block h-[10px] w-[10px] rounded-full"
            style={{
              background: '#FEBC2E',
              border: '0.5px solid rgba(0,0,0,0.08)',
            }}
          />
          <span
            className="block h-[10px] w-[10px] rounded-full"
            style={{
              background: '#28C840',
              border: '0.5px solid rgba(0,0,0,0.08)',
            }}
          />
        </div>

        {/* Title */}
        <span
          className="select-none text-[11px] font-semibold"
          style={{ color: '#6a5a4a' }}
        >
          {title}
        </span>

        {/* Badge */}
        {badge && (
          <span
            className="select-none text-[9px] font-bold"
            style={{
              padding: '2px 7px',
              borderRadius: 4,
              background: BADGE_STYLES[badge.variant].bg,
              color: BADGE_STYLES[badge.variant].color,
            }}
          >
            {badge.text}
          </span>
        )}

        {/* Action buttons */}
        <div
          className="ml-auto flex items-center gap-1"
          style={{
            opacity: titlebarHovered ? 1 : 0,
            transform: titlebarHovered ? 'scale(1)' : 'scale(0.8)',
            transition: 'opacity 0.18s ease, transform 0.18s ease',
          }}
        >
          <button
            type="button"
            className="flex h-[22px] w-[22px] items-center justify-center"
            style={{
              borderRadius: 5,
              border: '0.5px solid #E2D9CA',
              background: 'transparent',
            }}
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimized(id);
            }}
            title={isMinimized ? 'Expandir' : 'Minimizar'}
          >
            {isMinimized ? (
              <Maximize2 className="h-3 w-3 text-text-tertiary" />
            ) : (
              <Minus className="h-3 w-3 text-text-tertiary" />
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <div
          className="flex-1 overflow-y-auto p-3"
          style={{
            transition: 'opacity 150ms ease',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
