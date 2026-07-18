'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days}d`;
  if (days < 30) return `hace ${Math.floor(days / 7)}sem`;
  return `hace ${Math.floor(days / 30)}m`;
}

function healthColor(done: number, total: number): string {
  if (total === 0) return 'var(--text-muted)';
  const pct = done / total;
  if (pct >= 0.7) return 'var(--success)';
  if (pct >= 0.3) return 'var(--warning)';
  return 'var(--text-muted)';
}
import { useCanvasStore } from '@/stores/canvas-store';
import { useProjectsStore } from '@/stores/projects-store';
import { ProjectIcon } from '../project-icon';
import type { ProjectListItem } from '@/types/projects';

type FilterMode = 'active' | 'all' | 'archived';

interface WindowProjectsProps {
  userId: string;
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    'Activo': 'var(--success)',
    'Archivado': 'var(--text-muted)',
    'Idea': '#c4a07a',
    'Pausado': 'var(--warning)',
    'Completado': 'var(--accent-terracotta)',
  };
  return map[status] ?? 'var(--text-muted)';
}

function ProjectFolder({ logoUrl, icon, isHovered, color }: { logoUrl: string | null; icon: string; isHovered: boolean; color?: string }) {
  if (logoUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={logoUrl}
        alt=""
        className="rounded-[5px] object-cover"
        style={{
          width: 40,
          height: 32,
          transition: 'transform 0.2s ease',
          transform: isHovered ? 'translateX(-2px) rotate(-5deg)' : undefined,
        }}
      />
    );
  }

  const folderColor = color ?? 'var(--accent-terracotta)';
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: 40,
        height: 32,
        borderRadius: 5,
        background: `color-mix(in srgb, ${folderColor} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${folderColor} 30%, transparent)`,
        color: folderColor,
        transition: 'transform 0.2s ease',
        transform: isHovered ? 'translateX(-2px) rotate(-5deg)' : undefined,
      }}
    >
      <ProjectIcon icon={icon} size={17} />
    </div>
  );
}

function ProjectCard({
  project,
  isActive,
  onClick,
  onOpen,
}: {
  project: ProjectListItem;
  isActive: boolean;
  onClick: () => void;
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const statusColor = getStatusColor(project.status);

  const progress = project.task_count > 0
    ? Math.round((project.done_task_count / project.task_count) * 100)
    : 0;
  const pending = project.task_count - project.done_task_count;
  const hColor = healthColor(project.done_task_count, project.task_count);

  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex cursor-pointer flex-col items-start gap-[5px] text-left"
      style={{
        borderRadius: 9,
        padding: '8px 8px',
        border: isActive
          ? '1px solid rgba(196,112,74,0.38)'
          : hovered
            ? '1px solid rgba(196,112,74,0.22)'
            : '1px solid var(--border-stone)',
        background: isActive
          ? 'rgba(196,112,74,0.08)'
          : hovered
            ? 'rgba(196,112,74,0.04)'
            : 'var(--bg-card)',
        transition: 'all 0.18s ease',
        transform: hovered && !isActive ? 'translateY(-1px)' : undefined,
        width: '100%',
      }}
    >
      {/* Top row: folder + name */}
      <div className="flex items-center gap-[6px] w-full min-w-0">
        <div style={{ opacity: isActive ? 1 : 0.6, flexShrink: 0 }}>
          <ProjectFolder logoUrl={project.logo_url} icon={project.icon} isHovered={hovered} color={statusColor} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span
            className="font-sans font-medium leading-tight truncate"
            title={project.name}
            style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block' }}
          >
            {project.name}
          </span>
          <span
            className="font-sans leading-tight truncate"
            style={{ fontSize: 8, color: 'var(--text-tertiary)' }}
          >
            {project.status}
          </span>
        </div>
        {/* Health indicator */}
        <span
          className="shrink-0 rounded-full"
          style={{ width: 6, height: 6, background: hColor, opacity: 0.85 }}
          title={`${progress}% completado`}
        />
      </div>

      {/* Progress bar */}
      {project.task_count > 0 && (
        <div className="w-full">
          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--bg-sand)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: hColor }}
            />
          </div>
          <div className="flex items-center justify-between mt-[2px]">
            <span style={{ fontSize: 8, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
              {pending > 0 ? `${pending} pendiente${pending !== 1 ? 's' : ''}` : '✓ todo listo'}
            </span>
            <span style={{ fontSize: 8, color: 'var(--text-tertiary)' }}>
              {relativeTime(project.updated_at)}
            </span>
          </div>
        </div>
      )}
    </button>
  );
}

const MAX_VISIBLE_PROJECTS = 8;

function ProjectsGrid({
  projects,
  selectedProjectId,
  onSelect,
  onOpen,
}: {
  projects: ProjectListItem[];
  selectedProjectId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? projects : projects.slice(0, MAX_VISIBLE_PROJECTS);
  const hasMore = projects.length > MAX_VISIBLE_PROJECTS;

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex flex-col gap-[4px]">
        {visible.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            isActive={project.id === selectedProjectId}
            onClick={() => onSelect(project.id)}
            onOpen={() => onOpen(project.id)}
          />
        ))}
      </div>
      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="cursor-pointer font-sans text-[10px] font-medium text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
        >
          Ver todos ({projects.length})
        </button>
      )}
      {hasMore && showAll && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="cursor-pointer font-sans text-[10px] font-medium text-text-tertiary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
        >
          Mostrar menos
        </button>
      )}
    </div>
  );
}

// ─── Main component ─────────────────

export function WindowProjects({ userId }: WindowProjectsProps) {
  const router = useRouter();

  const projects = useProjectsStore((s) => s.projects);
  const fetchProject = useProjectsStore((s) => s.fetchProject);
  const editProject = useProjectsStore((s) => s.editProject);
  const clearActiveProject = useProjectsStore((s) => s.clearActiveProject);
  const activeProject = useProjectsStore((s) => s.activeProject);
  const selectedProjectId = useCanvasStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useCanvasStore((s) => s.setSelectedProjectId);

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('active');
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 300);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchValue]);

  // Re-fetch active project if selectedProjectId is set but activeProject is null/stale
  useEffect(() => {
    if (selectedProjectId && (!activeProject || activeProject.id !== selectedProjectId)) {
      fetchProject(selectedProjectId);
    } else if (!selectedProjectId && projects.length > 0) {
      const firstId = projects[0].id;
      setSelectedProjectId(firstId);
      fetchProject(firstId);
    }
  }, [selectedProjectId, activeProject, projects, setSelectedProjectId, fetchProject]);

  // Base filter by status tab
  const baseFiltered = useMemo(() => {
    if (filterMode === 'active') return projects.filter((p) => p.status !== 'Archivado');
    if (filterMode === 'archived') return projects.filter((p) => p.status === 'Archivado');
    return projects;
  }, [projects, filterMode]);

  // Filter by search
  const filteredProjects = useMemo(() => {
    if (!debouncedSearch) return baseFiltered;
    const q = debouncedSearch.toLowerCase();
    return baseFiltered.filter((p) => p.name.toLowerCase().includes(q));
  }, [baseFiltered, debouncedSearch]);

  // Auto-select first visible project when selected project is filtered out
  useEffect(() => {
    if (
      selectedProjectId &&
      filteredProjects.length > 0 &&
      !filteredProjects.some((p) => p.id === selectedProjectId)
    ) {
      const firstId = filteredProjects[0].id;
      setSelectedProjectId(firstId);
      fetchProject(firstId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredProjects]);

  const handleSelectProject = useCallback(
    (projectId: string) => {
      setSelectedProjectId(projectId);
      fetchProject(projectId);
    },
    [setSelectedProjectId, fetchProject],
  );

  const handleOpen = useCallback(
    (projectId?: string) => {
      const id = projectId ?? selectedProjectId;
      if (id) {
        router.push(`/proyectos/${id}`);
      }
    },
    [router, selectedProjectId],
  );

  const isArchivedTab = filterMode === 'archived';

  function handleArchiveOrUnarchive() {
    if (!selectedProjectId) return;
    if (isArchivedTab) {
      // Unarchive: restore to 'Activo'
      editProject(selectedProjectId, { status: 'Activo' });
      setFilterMode('active');
      return;
    }
    // Archive flow with confirmation
    if (!confirmingArchive) {
      setConfirmingArchive(true);
      confirmTimerRef.current = setTimeout(() => setConfirmingArchive(false), 3000);
      return;
    }
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    editProject(selectedProjectId, { status: 'Archivado' });
    clearActiveProject();
    setSelectedProjectId(null);
    setConfirmingArchive(false);
  }

  void userId;

  const filterTabs: { key: FilterMode; label: string }[] = [
    { key: 'active', label: 'Activos' },
    { key: 'all', label: 'Todos' },
    { key: 'archived', label: 'Archivados' },
  ];

  return (
    <div className="flex flex-col gap-[10px]">
      {/* Filter tabs */}
      <div role="tablist" className="flex gap-[4px]">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={filterMode === tab.key}
            onClick={() => setFilterMode(tab.key)}
            className="flex-1 cursor-pointer font-sans text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
            style={{
              padding: '4px 0',
              borderRadius: 5,
              border: filterMode === tab.key ? '0.5px solid rgba(196,112,74,0.4)' : '0.5px solid var(--border-stone)',
              background: filterMode === tab.key ? 'rgba(196,112,74,0.10)' : 'transparent',
              color: filterMode === tab.key ? 'var(--accent-terracotta)' : 'var(--text-tertiary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-[6px]"
        style={{
          background: 'var(--bg-sand)',
          border: '0.5px solid var(--border-stone)',
          borderRadius: 7,
          padding: '6px 9px',
          fontSize: 11,
        }}
      >
        <Search size={12} style={{ color: '#aaa', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Buscar proyecto..."
          aria-label="Buscar proyecto"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full border-none bg-transparent font-sans text-[11px] outline-none placeholder:text-text-faint focus-visible:outline-none"
          style={{ color: 'var(--text-secondary)' }}
        />
      </div>

      {/* Projects grid */}
      {filteredProjects.length === 0 ? (
        <p className="py-4 text-center font-sans text-[10px] text-text-tertiary">
          {projects.length === 0 ? 'Sin proyectos' : 'Sin resultados'}
        </p>
      ) : (
        <ProjectsGrid
          projects={filteredProjects}
          selectedProjectId={selectedProjectId}
          onSelect={handleSelectProject}
          onOpen={handleOpen}
        />
      )}

      {/* Action buttons */}
      <div className="flex gap-[6px]">
        <button
          type="button"
          disabled={!selectedProjectId}
          className="flex-1 cursor-pointer font-sans text-[10px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            padding: 6,
            borderRadius: 6,
            border: confirmingArchive ? '0.5px solid var(--accent-terracotta)' : '0.5px solid var(--border-stone)',
            background: confirmingArchive ? 'rgba(196,112,74,0.08)' : 'transparent',
            color: confirmingArchive ? 'var(--accent-terracotta)' : 'var(--text-secondary)',
            transition: 'all 0.13s ease',
          }}
          onClick={handleArchiveOrUnarchive}
        >
          {isArchivedTab ? 'Desarchivar' : confirmingArchive ? '¿Confirmar?' : 'Archivar'}
        </button>
        <button
          type="button"
          className="flex-1 cursor-pointer font-sans text-[10px] font-medium"
          style={{
            padding: 6,
            borderRadius: 6,
            border: 'none',
            background: 'var(--accent-terracotta)',
            color: '#fff',
            transition: 'all 0.13s ease',
          }}
          onClick={() => handleOpen()}
        >
          Abrir
        </button>
      </div>
    </div>
  );
}
