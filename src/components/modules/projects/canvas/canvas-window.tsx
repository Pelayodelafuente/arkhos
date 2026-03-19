'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useDragControls, type PanInfo } from 'framer-motion';
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
  width: number;
  index: number;
  dragConstraintsRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

// ─── Constants ───────────────────────

const STAGGER_DELAYS = [0.55, 0.8, 1.05, 1.3, 1.5];
const FLOAT_DELAYS = [0, 0.7, 1.4, 2.1, 0.35];

const BADGE_STYLES: Record<CanvasWindowBadge['variant'], { bg: string; color: string }> = {
  terracotta: { bg: 'rgba(196,112,74,0.12)', color: '#C4704A' },
  green: { bg: 'rgba(122,155,118,0.15)', color: '#4a7a46' },
  gray: { bg: 'rgba(136,135,128,0.12)', color: '#888780' },
};

// ─── Component ───────────────────────

export function CanvasWindow({
  id,
  title,
  badge,
  width,
  index,
  dragConstraintsRef,
  children,
}: CanvasWindowProps) {
  const dragControls = useDragControls();
  const positions = useCanvasStore((s) => s.positions);
  const windowOrder = useCanvasStore((s) => s.windowOrder);
  const setPosition = useCanvasStore((s) => s.setPosition);
  const bringToFront = useCanvasStore((s) => s.bringToFront);
  const saveLayoutRef = useRef(useCanvasStore.getState().saveLayout);

  const [isDragging, setIsDragging] = useState(false);
  const [entryComplete, setEntryComplete] = useState(false);
  const [titlebarHovered, setTitlebarHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const pos = positions[id] ?? { x: 0, y: 0 };
  const zIndex = windowOrder.indexOf(id) + 1;
  const staggerDelay = STAGGER_DELAYS[index] ?? 0.55;
  const floatDelay = FLOAT_DELAYS[index] ?? 0;

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const newPos = {
      x: pos.x + info.offset.x,
      y: pos.y + info.offset.y,
    };
    setPosition(id, newPos);
    // Save layout after drag — get userId from a stable ref would be complex,
    // so we trigger save via the store which consumers can call
  };

  const handleClick = () => {
    bringToFront(id);
  };

  // Entry animation variants
  const entryEasing: [number, number, number, number] = [0.22, 1, 0.36, 1];

  const entryVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 1, y: 0, scale: 1 },
        visible: { opacity: 1, y: 0, scale: 1 },
      }
    : {
        hidden: { opacity: 0, y: 28, scale: 0.96 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.5,
            ease: entryEasing,
            delay: staggerDelay,
          },
        },
      };

  // Float animation (only after entry completes)
  const floatAnimation =
    entryComplete && !isDragging && !prefersReducedMotion
      ? {
          y: [0, -5, 0],
          transition: {
            duration: 4,
            ease: 'easeInOut' as const,
            repeat: Infinity,
            repeatType: 'mirror' as const,
            delay: floatDelay,
          },
        }
      : undefined;

  // Shadow styles
  const defaultShadow = '0 8px 32px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)';
  const draggingShadow = '0 32px 80px rgba(0,0,0,0.18), 0 4px 20px rgba(196,112,74,0.2)';

  return (
    <motion.div
      initial="hidden"
      animate={floatAnimation ?? 'visible'}
      variants={entryVariants}
      onAnimationComplete={(definition) => {
        if (definition === 'visible') {
          setEntryComplete(true);
        }
      }}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={dragConstraintsRef}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width,
        minWidth: 180,
        minHeight: 80,
        zIndex,
        background: 'rgba(255,252,248,0.97)',
        border: '0.5px solid #E2D9CA',
        borderRadius: 14,
        boxShadow: isDragging ? draggingShadow : defaultShadow,
        cursor: 'default',
        transform: isDragging ? 'scale(1.018)' : undefined,
      }}
    >
      {/* Titlebar */}
      <div
        className="flex items-center gap-2"
        style={{
          padding: '10px 12px 9px',
          borderBottom: '0.5px solid #EDE8E0',
          background: 'rgba(250,247,242,0.6)',
          borderRadius: '14px 14px 0 0',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onPointerDown={(e) => dragControls.start(e)}
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

        {/* Hover action buttons */}
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
            onClick={(e) => e.stopPropagation()}
          >
            <Minus className="h-3 w-3 text-text-tertiary" />
          </button>
          <button
            type="button"
            className="flex h-[22px] w-[22px] items-center justify-center"
            style={{
              borderRadius: 5,
              border: '0.5px solid #E2D9CA',
              background: 'transparent',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Maximize2 className="h-3 w-3 text-text-tertiary" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        {children}
      </div>
    </motion.div>
  );
}
