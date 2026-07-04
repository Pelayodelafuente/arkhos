'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCanvasStore } from '@/stores/canvas-store';
import { useProjectsStore } from '@/stores/projects-store';
import { useUIStore } from '@/stores/ui-store';
import { createClient } from '@/lib/supabase/client';
import { getProjectTypes, getProjectStatuses, seedUserDefaults } from '@/lib/supabase/projects';
import {
  DEFAULT_PROJECT_TYPES,
  DEFAULT_PROJECT_STATUSES,
  type ProjectTypeRecord,
  type ProjectStatusRecord,
} from '@/types/projects';
import { ProjectModal } from '../project-modal';
import { CanvasGrid } from './canvas-grid';
import { CanvasWindow } from './canvas-window';
import { WindowProjects } from './window-projects';
import { WindowStats } from './window-stats';
import { WindowDetail } from './window-detail';
import { WindowContext } from './window-context';
import { WindowActivity } from './window-activity';
import { WindowFocus } from './window-focus';

// ─── Types ───────────────────────────

interface ProjectCanvasProps {
  userId: string;
}

// ─── Component ───────────────────────

export function ProjectCanvas({ userId }: ProjectCanvasProps) {
  // El store ya viene hidratado por `AppDataLoader` (megacarga única al
  // login) vía `hydrateProjects`, que marca `initialized: true`. Si el
  // módulo `proyectos` vino degradado a `{ error }` en la megacarga,
  // `initialized` queda en false y este fetch actúa de red de seguridad.
  const initialized = useProjectsStore((s) => s.initialized);
  const selectedProjectId = useCanvasStore((s) => s.selectedProjectId);
  const fetchProjects = useProjectsStore((s) => s.fetchProjects);
  const projects = useProjectsStore((s) => s.projects);
  const openModal = useUIStore((s) => s.openModal);

  const [projectTypes, setProjectTypes] = useState<ProjectTypeRecord[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatusRecord[]>([]);

  // Red de seguridad: solo dispara si la megacarga no pobló el store.
  useEffect(() => {
    if (!initialized) fetchProjects(userId);
  }, [userId, initialized, fetchProjects]);

  // Load project types and statuses for the new-project modal
  useEffect(() => {
    async function loadMeta() {
      const client = createClient();
      await seedUserDefaults(client, userId, {
        types: DEFAULT_PROJECT_TYPES,
        statuses: DEFAULT_PROJECT_STATUSES,
      });
      const [types, statuses] = await Promise.all([
        getProjectTypes(client, userId),
        getProjectStatuses(client, userId),
      ]);
      setProjectTypes(types);
      setProjectStatuses(statuses);
    }
    loadMeta();
  }, [userId]);

  // Derive selected project name for stats window title
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const statsTitle = selectedProject ? selectedProject.name : 'Stats del proyecto';

  return (
    <div className="flex flex-col overflow-hidden" style={{ position: 'absolute', inset: 0 }}>
      {/* Background grid */}
      <CanvasGrid />

      {/* Topbar */}
      <div
        className="relative z-10 flex h-12 shrink-0 items-center gap-3 px-4"
        style={{
          background: 'color-mix(in srgb, var(--bg-page) 85%, transparent)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '0.5px solid var(--border-stone)',
        }}
      >
        <span
          className="font-heading text-[15px] font-bold"
          style={{ color: 'var(--accent-terracotta)', letterSpacing: '-0.3px' }}
        >
          Arkhos
        </span>
        <div className="h-[15px] w-px" style={{ background: 'var(--border-stone)' }} />
        <h1 className="text-[12px] font-medium text-text-tertiary" style={{ margin: 0 }}>
          Proyectos
        </h1>

        <div className="ml-auto flex items-center gap-2">
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

      {/* 3-column layout (stacks vertically below 1200px) */}
      <div className="canvas-columns relative z-10 min-h-0 flex-1 gap-3 p-3">
        {/* Left column: Stats + Projects */}
        <div className="canvas-col-left flex flex-col gap-3">
          <CanvasWindow id="stats" title={statsTitle}>
            <WindowStats />
          </CanvasWindow>

          <CanvasWindow id="projects" title="Mis proyectos" className="flex-1 min-h-0">
            <WindowProjects userId={userId} />
          </CanvasWindow>
        </div>

        {/* Center column: Project detail */}
        <div className="canvas-col-center flex min-w-0 flex-col">
          <CanvasWindow id="detail" title="Detalle del proyecto" className="flex-1 min-h-0">
            <WindowDetail userId={userId} />
          </CanvasWindow>
        </div>

        {/* Right column: Context + AI placeholder + Focus */}
        <div className="canvas-col-right flex flex-col gap-3">
          <CanvasWindow id="context" title="Contexto activo">
            <WindowContext />
          </CanvasWindow>

          <CanvasWindow id="activity" title="Actividad reciente">
            <WindowActivity userId={userId} />
          </CanvasWindow>

          <CanvasWindow id="focus" title="Focus — Tareas pendientes" className="flex-1 min-h-0">
            <WindowFocus userId={userId} />
          </CanvasWindow>
        </div>
      </div>

      {/* New project modal */}
      <ProjectModal
        userId={userId}
        projectTypes={projectTypes}
        projectStatuses={projectStatuses}
        onTypesChange={setProjectTypes}
        onStatusesChange={setProjectStatuses}
      />

      {/* Responsive styles */}
      <style>{`
        .canvas-columns {
          display: flex;
          overflow: hidden;
        }
        .canvas-col-left {
          width: 280px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .canvas-col-center {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .canvas-col-right {
          width: 280px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        @media (max-width: 1199px) {
          .canvas-columns {
            flex-direction: column;
            overflow-y: auto;
          }
          .canvas-col-left,
          .canvas-col-center,
          .canvas-col-right {
            width: 100%;
            flex-shrink: unset;
            overflow: visible;
            height: auto;
          }
        }
      `}</style>
    </div>
  );
}
