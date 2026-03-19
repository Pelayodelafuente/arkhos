'use client';

import { useEffect, useState } from 'react';
import { RotateCcw, Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCanvasStore } from '@/stores/canvas-store';
import { useUIStore } from '@/stores/ui-store';

export function CanvasTopbar() {
  const resetLayout = useCanvasStore((s) => s.resetLayout);
  const openModal = useUIStore((s) => s.openModal);
  const [visible, setVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, [prefersReducedMotion]);

  return (
    <div
      className="absolute inset-x-0 top-0 z-[100] flex h-12 items-center gap-3 px-4"
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'rgba(250,247,242,0.85)',
        borderBottom: '0.5px solid #E2D9CA',
        opacity: visible ? 1 : 0,
        transition: prefersReducedMotion ? 'none' : 'opacity 0.4s ease',
      }}
    >
      {/* Left side */}
      <span
        className="font-heading text-[15px] font-bold"
        style={{ color: '#C4704A', letterSpacing: '-0.3px' }}
      >
        Arkhos
      </span>

      <div
        className="h-[15px] w-px"
        style={{ background: '#E2D9CA' }}
      />

      <span className="text-[12px] font-medium text-text-tertiary">
        Proyectos
      </span>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={resetLayout}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset layout
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => openModal('new-project')}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nuevo proyecto
        </Button>
      </div>
    </div>
  );
}
