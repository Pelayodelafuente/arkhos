'use client';

import { useEffect, useRef } from 'react';
import { useCanvasStore } from '@/stores/canvas-store';
import { useProjectsStore } from '@/stores/projects-store';
import { CanvasGhostCursor } from './canvas-ghost-cursor';
import { CanvasGrid } from './canvas-grid';
import { CanvasMinimap } from './canvas-minimap';
import { CanvasTopbar } from './canvas-topbar';
import { CanvasWindow } from './canvas-window';
import { CanvasZoom } from './canvas-zoom';
import { WindowAnalysis } from './window-analysis';
import { WindowChat } from './window-chat';
import { WindowContext } from './window-context';
import { WindowProjects } from './window-projects';
import { WindowStats } from './window-stats';

// ─── Types ───────────────────────────

interface ProjectCanvasProps {
  userId: string;
}

// ─── Component ───────────────────────

export function ProjectCanvas({ userId }: ProjectCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const loadLayout = useCanvasStore((s) => s.loadLayout);
  const saveLayout = useCanvasStore((s) => s.saveLayout);
  const zoom = useCanvasStore((s) => s.zoom);
  const positions = useCanvasStore((s) => s.positions);
  const selectedProjectId = useCanvasStore((s) => s.selectedProjectId);

  const fetchProjects = useProjectsStore((s) => s.fetchProjects);
  const projects = useProjectsStore((s) => s.projects);

  // Load layout and projects on mount
  useEffect(() => {
    loadLayout(userId);
    fetchProjects(userId);
  }, [userId, loadLayout, fetchProjects]);

  // Save layout when positions or zoom change
  useEffect(() => {
    saveLayout(userId);
  }, [positions, zoom, userId, saveLayout]);

  // Derive selected project name for stats window title
  const analysisBadge = useCanvasStore((s) => s.analysisBadge);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const statsTitle = selectedProject ? selectedProject.name : 'Stats del proyecto';

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100vh-var(--topbar-height,0px))] w-full select-none overflow-hidden bg-background"
    >
      {/* Background grid */}
      <CanvasGrid />

      {/* Floating topbar */}
      <CanvasTopbar />

      {/* Zoomable canvas area */}
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `scale(${zoom / 100})`,
        }}
      >
        {/* Window: Projects list */}
        <CanvasWindow
          id="projects"
          title="Mis proyectos"
          width={212}
          index={0}
          dragConstraintsRef={containerRef}
        >
          <WindowProjects userId={userId} />
        </CanvasWindow>

        {/* Window: Stats */}
        <CanvasWindow
          id="stats"
          title={statsTitle}
          badge={{ text: `${projects.length} proyectos`, variant: 'terracotta' }}
          width={220}
          index={1}
          dragConstraintsRef={containerRef}
        >
          <WindowStats />
        </CanvasWindow>

        {/* Window: AI Analysis */}
        <CanvasWindow
          id="analysis"
          title="Análisis IA"
          badge={analysisBadge}
          width={220}
          index={2}
          dragConstraintsRef={containerRef}
        >
          <WindowAnalysis />
        </CanvasWindow>

        {/* Window: Active context */}
        <CanvasWindow
          id="context"
          title="Contexto activo"
          width={200}
          index={3}
          dragConstraintsRef={containerRef}
        >
          <WindowContext />
        </CanvasWindow>

        {/* Window: Chat */}
        <CanvasWindow
          id="chat"
          title="Chat con el proyecto"
          badge={{ text: '\u03B2', variant: 'gray' }}
          width={234}
          index={4}
          dragConstraintsRef={containerRef}
        >
          <WindowChat />
        </CanvasWindow>
      </div>

      {/* Canvas overlays (outside zoom wrapper) */}
      <CanvasMinimap />
      <CanvasZoom />
      <CanvasGhostCursor />
    </div>
  );
}
