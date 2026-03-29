'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Tooltip } from '@/components/ui';
import { useCanvasStore } from '@/stores/canvas-store';
import { useProjectsStore } from '@/stores/projects-store';
import type { ProjectListItem } from '@/types/projects';

type FilterMode = 'active' | 'all' | 'archived';

interface WindowProjectsProps {
  userId: string;
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    'Activo': '#056b63',
    'Archivado': '#9a7a5a',
    'Idea': '#c4a07a',
    'Pausado': '#9a6a28',
    'Completado': '#c4704a',
  };
  return map[status] ?? '#9a7a5a';
}

function ProjectFolder({ logoUrl, isHovered, color }: { logoUrl: string | null; isHovered: boolean; color?: string }) {
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

  const folderColor = color ?? '#C4704A';
  return (
    <div
      style={{
        width: 40,
        height: 32,
        borderRadius: 5,
        background: folderColor,
        position: 'relative',
        transition: 'transform 0.2s ease',
        transform: isHovered ? 'translateX(-2px) rotate(-5deg)' : undefined,
      }}
    >
      <span
        style={{
          content: '""',
          position: 'absolute',
          top: -6,
          left: 3,
          width: 13,
          height: 7,
          background: folderColor,
          borderRadius: '3px 3px 0 0',
          opacity: 0.72,
        }}
      />
    </div>
  );
}

function ProjectCard({
  project,
  isActive,
  onClick,
}: {
  project: ProjectListItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const statusColor = getStatusColor(project.status);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex cursor-pointer flex-col items-center gap-[5px]"
      style={{
        borderRadius: 9,
        padding: '9px 6px',
        border: isActive
          ? '1px solid rgba(196,112,74,0.38)'
          : hovered
            ? '1px solid rgba(196,112,74,0.22)'
            : '1px solid transparent',
        background: isActive
          ? 'rgba(196,112,74,0.10)'
          : hovered
            ? 'rgba(196,112,74,0.06)'
            : 'transparent',
        transition: 'all 0.18s ease',
        transform: hovered && !isActive ? 'translateY(-2px)' : undefined,
      }}
    >
      <div style={{ opacity: isActive ? 1 : 0.35 }}>
        <ProjectFolder logoUrl={project.logo_url} isHovered={hovered} color={statusColor} />
      </div>
      <Tooltip content={project.name} position="bottom">
        <span
          className="font-sans font-medium leading-tight"
          style={{
            fontSize: 9,
            color: 'var(--text-secondary)',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: 70,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {project.name}
        </span>
      </Tooltip>
      {/* Status dot with tooltip */}
      <Tooltip content={project.status} position="bottom">
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: statusColor,
            opacity: 0.85,
            flexShrink: 0,
          }}
        />
      </Tooltip>
    </button>
  );
}

const MAX_VISIBLE_PROJECTS = 8;

function ProjectsGrid({
  projects,
  selectedProjectId,
  onSelect,
}: {
  projects: ProjectListItem[];
  selectedProjectId: string | null;
  onSelect: (id: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? projects : projects.slice(0, MAX_VISIBLE_PROJECTS);
  const hasMore = projects.length > MAX_VISIBLE_PROJECTS;

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="grid grid-cols-2 gap-[6px]">
        {visible.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            isActive={project.id === selectedProjectId}
            onClick={() => onSelect(project.id)}
          />
        ))}
      </div>
      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="font-sans text-[10px] font-medium text-accent transition-colors hover:underline"
        >
          Ver todos ({projects.length})
        </button>
      )}
      {hasMore && showAll && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="font-sans text-[10px] font-medium text-text-tertiary transition-colors hover:underline"
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

  const handleOpen = useCallback(() => {
    if (selectedProjectId) {
      router.push(`/proyectos/${selectedProjectId}`);
    }
  }, [router, selectedProjectId]);

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
      <div className="flex gap-[4px]">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterMode(tab.key)}
            className="flex-1 font-sans text-[10px] font-medium transition-colors"
            style={{
              padding: '4px 0',
              borderRadius: 5,
              border: filterMode === tab.key ? '0.5px solid rgba(196,112,74,0.4)' : '0.5px solid var(--border-medium)',
              background: filterMode === tab.key ? 'rgba(196,112,74,0.10)' : 'transparent',
              color: filterMode === tab.key ? '#C4704A' : 'var(--text-tertiary)',
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
          background: '#F5F0EA',
          border: '0.5px solid var(--border-medium)',
          borderRadius: 7,
          padding: '6px 9px',
          fontSize: 11,
        }}
      >
        <Search size={12} style={{ color: '#aaa', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Buscar proyecto..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full border-none bg-transparent font-sans text-[11px] outline-none placeholder:text-[#b89878]"
          style={{ color: '#5a3e28' }}
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
            border: confirmingArchive ? '0.5px solid #c4704a' : '0.5px solid var(--border-medium)',
            background: confirmingArchive ? 'rgba(196,112,74,0.08)' : 'transparent',
            color: confirmingArchive ? '#c4704a' : 'var(--text-secondary)',
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
            background: '#C4704A',
            color: '#fff',
            transition: 'all 0.13s ease',
          }}
          onClick={handleOpen}
        >
          Abrir
        </button>
      </div>
    </div>
  );
}
