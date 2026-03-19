'use client';

import { useCanvasStore, WINDOW_IDS } from '@/stores/canvas-store';

// ─── Constants ───────────────────────

const WINDOW_WIDTHS: Record<string, number> = {
  projects: 212,
  stats: 220,
  analysis: 220,
  context: 200,
  chat: 234,
};

const ESTIMATED_WINDOW_HEIGHT = 200;
const CANVAS_REF_WIDTH = 1200;
const CANVAS_REF_HEIGHT = 700;

const MINIMAP_INNER_WIDTH = 78; // 92 - 14 (7px padding each side)
const MINIMAP_INNER_HEIGHT = 40;

// ─── Component ───────────────────────

export function CanvasMinimap() {
  const positions = useCanvasStore((s) => s.positions);

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        bottom: 18,
        right: 18,
        width: 92,
        height: 66,
        background: 'rgba(250,247,242,0.9)',
        border: '0.5px solid #E2D9CA',
        borderRadius: 9,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 50,
        padding: 7,
        animation: 'fadeIn 0.5s ease 2.2s both',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* Label */}
      <span
        className="block select-none"
        style={{
          fontSize: 8,
          color: '#bbb',
          marginBottom: 4,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.3,
        }}
      >
        Canvas
      </span>

      {/* Dots container */}
      <div className="relative" style={{ width: '100%', height: 40 }}>
        {WINDOW_IDS.map((windowId) => {
          const pos = positions[windowId];
          if (!pos) return null;

          const dotX = (pos.x / CANVAS_REF_WIDTH) * MINIMAP_INNER_WIDTH;
          const dotY = (pos.y / CANVAS_REF_HEIGHT) * MINIMAP_INNER_HEIGHT;
          const dotW =
            ((WINDOW_WIDTHS[windowId] ?? 200) / CANVAS_REF_WIDTH) *
            MINIMAP_INNER_WIDTH;
          const dotH =
            (ESTIMATED_WINDOW_HEIGHT / CANVAS_REF_HEIGHT) * MINIMAP_INNER_HEIGHT;

          return (
            <div
              key={windowId}
              className="absolute"
              style={{
                left: dotX,
                top: dotY,
                width: Math.max(dotW, 4),
                height: Math.max(dotH, 3),
                borderRadius: 3,
                background: 'rgba(196,112,74,0.22)',
                border: '0.5px solid rgba(196,112,74,0.4)',
                transition: 'all 0.2s',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
