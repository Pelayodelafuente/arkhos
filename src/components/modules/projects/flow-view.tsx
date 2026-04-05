'use client';

import { useState, useRef, useCallback } from 'react';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { PHASE_STATUS_CONFIG, type ProjectPhase } from '@/types/projects';

// ─── Constants ───────────────────────────────────

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;
const NODE_GAP = 80;
const SVG_WIDTH = 600;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;
const BEZIER_CONTROL_OFFSET = 40;

// ─── Component ───────────────────────────────────

interface FlowViewProps {
  phases: ProjectPhase[];
}

export default function FlowView({ phases }: FlowViewProps) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOriginRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const centerX = SVG_WIDTH / 2;
  const totalHeight = phases.length * (NODE_HEIGHT + NODE_GAP) + NODE_GAP;

  // ─── Pan handlers ─────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Only pan on background clicks (not on nodes)
      if ((e.target as SVGElement).closest('[data-phase-node]')) return;
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panOriginRef.current = { x: pan.x, y: pan.y };
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isPanning) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: panOriginRef.current.x + dx,
        y: panOriginRef.current.y + dy,
      });
    },
    [isPanning],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ─── Zoom handlers ────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    setZoom((prev) => {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      return Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev + delta)) * 10) / 10;
    });
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.round(Math.min(ZOOM_MAX, prev + ZOOM_STEP) * 10) / 10);
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.round(Math.max(ZOOM_MIN, prev - ZOOM_STEP) * 10) / 10);
  }, []);

  const resetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  // ─── Node position helper ─────────────────

  const getNodeY = (index: number): number => {
    return NODE_GAP + index * (NODE_HEIGHT + NODE_GAP);
  };

  // ─── Render ───────────────────────────────

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl border border-border bg-card overflow-hidden"
      style={{ minHeight: 400 }}
    >
      <svg
        width="100%"
        height={Math.max(400, totalHeight * zoom + 100)}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        {/* ─── Defs: patterns, markers, filters ─── */}
        <defs>
          {/* Grid pattern */}
          <pattern id="flow-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.5" fill="var(--border-stone)" opacity="0.5" />
          </pattern>

          {/* Glow filter for active phase */}
          <filter id="glow-active" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#C4704A" floodOpacity="0.15" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arrow marker — green (done) */}
          <marker
            id="arrow-done"
            viewBox="0 0 10 8"
            refX="10"
            refY="4"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 4 L 0 8 Z" fill="#22C55E" />
          </marker>

          {/* Arrow marker — pending */}
          <marker
            id="arrow-pending"
            viewBox="0 0 10 8"
            refX="10"
            refY="4"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 4 L 0 8 Z" fill="var(--border-stone)" />
          </marker>

          {/* Arrow marker — active */}
          <marker
            id="arrow-active"
            viewBox="0 0 10 8"
            refX="10"
            refY="4"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 4 L 0 8 Z" fill="#C4704A" />
          </marker>
        </defs>

        {/* Background grid */}
        <rect width="100%" height="100%" fill="url(#flow-grid)" />

        {/* ─── Pannable/zoomable group ─── */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* ─── Connectors ─── */}
          {phases.map((phase, i) => {
            if (i >= phases.length - 1) return null;

            const nextPhase = phases[i + 1];
            const startY = getNodeY(i) + NODE_HEIGHT;
            const endY = getNodeY(i + 1);

            const path = `M ${centerX} ${startY} C ${centerX} ${startY + BEZIER_CONTROL_OFFSET}, ${centerX} ${endY - BEZIER_CONTROL_OFFSET}, ${centerX} ${endY}`;

            const isDone = phase.status === 'done';
            const isActive = phase.status === 'in-progress' || nextPhase.status === 'in-progress';
            const strokeColor = isDone ? '#22C55E' : isActive ? '#C4704A' : 'rgba(160,120,80,0.35)';
            const markerId = isDone ? 'arrow-done' : isActive ? 'arrow-active' : 'arrow-pending';

            return (
              <g key={`connector-${phase.id}`}>
                {/* Base line */}
                <path
                  d={path}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={2}
                  markerEnd={`url(#${markerId})`}
                />
                {/* Animated dash overlay for active connections */}
                {isActive && (
                  <path
                    d={path}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={2}
                    strokeDasharray="6,4"
                    style={{
                      animation: 'flowDash 1s linear infinite',
                    }}
                  />
                )}
              </g>
            );
          })}

          {/* ─── Phase nodes ─── */}
          {phases.map((phase, i) => {
            const nodeX = centerX - NODE_WIDTH / 2;
            const nodeY = getNodeY(i);
            const statusConfig = PHASE_STATUS_CONFIG[phase.status];
            const totalTasks = phase.tasks.length;
            const doneTasks = phase.tasks.filter((t) => t.done || t.status === 'done').length;
            const progress = totalTasks > 0 ? doneTasks / totalTasks : 0;

            const borderColor =
              phase.status === 'done'
                ? '#22C55E'
                : phase.status === 'in-progress'
                  ? '#C4704A'
                  : 'rgba(160,120,80,0.35)';
            const borderWidth = phase.status === 'pending' ? 1 : 2;
            const isActive = phase.status === 'in-progress';

            return (
              <g
                key={phase.id}
                data-phase-node
                filter={isActive ? 'url(#glow-active)' : undefined}
              >
                {/* Node background */}
                <rect
                  x={nodeX}
                  y={nodeY}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={12}
                  fill="#FFFFFF"
                  stroke={borderColor}
                  strokeWidth={borderWidth}
                />

                {/* Phase name */}
                <text
                  x={nodeX + 12}
                  y={nodeY + 22}
                  fontSize={12}
                  fontWeight={500}
                  fill="#2a1a10"
                  fontFamily="var(--font-sans)"
                >
                  {phase.name.length > 20 ? `${phase.name.slice(0, 20)}...` : phase.name}
                </text>

                {/* Status badge */}
                <rect
                  x={nodeX + NODE_WIDTH - 12 - getTextWidth(statusConfig.label)}
                  y={nodeY + 10}
                  width={getTextWidth(statusConfig.label) + 8}
                  height={18}
                  rx={9}
                  fill={statusConfig.color}
                  opacity={0.12}
                />
                <text
                  x={nodeX + NODE_WIDTH - 8 - getTextWidth(statusConfig.label)}
                  y={nodeY + 23}
                  fontSize={9}
                  fontWeight={600}
                  fill={statusConfig.color}
                  fontFamily="var(--font-sans)"
                >
                  {statusConfig.label}
                </text>

                {/* Progress bar background */}
                <rect
                  x={nodeX + 12}
                  y={nodeY + 40}
                  width={NODE_WIDTH - 24}
                  height={4}
                  rx={2}
                  fill="var(--border-stone)"
                />

                {/* Progress bar fill */}
                {progress > 0 && (
                  <rect
                    x={nodeX + 12}
                    y={nodeY + 40}
                    width={(NODE_WIDTH - 24) * progress}
                    height={4}
                    rx={2}
                    fill={statusConfig.color}
                  />
                )}

                {/* Task count text */}
                <text
                  x={nodeX + 12}
                  y={nodeY + 62}
                  fontSize={10}
                  fill="#9a7a5a"
                  fontFamily="var(--font-mono)"
                >
                  {doneTasks}/{totalTasks} tareas
                </text>
              </g>
            );
          })}
        </g>

        {/* CSS animation for flowing dashes */}
        <style>
          {`
            @keyframes flowDash {
              to { stroke-dashoffset: -20; }
            }
          `}
        </style>
      </svg>

      {/* ─── Zoom controls ─── */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-xl border border-border bg-card p-1">
        <button
          type="button"
          onClick={zoomOut}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-sand"
          aria-label="Alejar"
        >
          <ZoomOut size={14} />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-sand"
          aria-label="Centrar vista"
        >
          <Maximize2 size={14} />
        </button>
        <button
          type="button"
          onClick={zoomIn}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-sand"
          aria-label="Acercar"
        >
          <ZoomIn size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────

/** Approximate text width for status badge sizing (monospace-ish estimate) */
function getTextWidth(text: string): number {
  return text.length * 5.4;
}
