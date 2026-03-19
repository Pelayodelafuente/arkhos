'use client';

import { useCanvasStore } from '@/stores/canvas-store';

// ─── Component ───────────────────────

export function CanvasZoom() {
  const zoom = useCanvasStore((s) => s.zoom);
  const zoomIn = useCanvasStore((s) => s.zoomIn);
  const zoomOut = useCanvasStore((s) => s.zoomOut);

  return (
    <div
      className="absolute flex"
      style={{
        bottom: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(250,247,242,0.92)',
        border: '0.5px solid #E2D9CA',
        borderRadius: 9,
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 50,
        animation: 'fadeIn 0.5s ease 2.2s both',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* Zoom out button */}
      <button
        type="button"
        className="select-none border-none bg-transparent"
        style={{
          padding: '6px 13px',
          fontSize: 14,
          cursor: 'pointer',
          color: '#6a5a4a',
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(196,112,74,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onClick={zoomOut}
        aria-label="Zoom out"
      >
        −
      </button>

      {/* Zoom label */}
      <span
        className="font-mono flex select-none items-center justify-center"
        style={{
          padding: '6px 10px',
          fontSize: 11,
          color: '#aaa',
          borderLeft: '0.5px solid #E2D9CA',
          borderRight: '0.5px solid #E2D9CA',
          minWidth: 46,
          fontWeight: 500,
        }}
      >
        {zoom}%
      </span>

      {/* Zoom in button */}
      <button
        type="button"
        className="select-none border-none bg-transparent"
        style={{
          padding: '6px 13px',
          fontSize: 14,
          cursor: 'pointer',
          color: '#6a5a4a',
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(196,112,74,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onClick={zoomIn}
        aria-label="Zoom in"
      >
        +
      </button>
    </div>
  );
}
