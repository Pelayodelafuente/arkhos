'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvas-store';
import { useProjectsStore } from '@/stores/projects-store';
import type { ProjectListItem } from '@/types/projects';

// ─── Types ───────────────────────────

interface WindowProjectsProps {
  userId: string;
}

// ─── Folder icon component ──────────

function ProjectFolder({ logoUrl, isHovered }: { logoUrl: string | null; isHovered: boolean }) {
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

  return (
    <div
      style={{
        width: 40,
        height: 32,
        borderRadius: 5,
        background: '#C4704A',
        position: 'relative',
        transition: 'transform 0.2s ease',
        transform: isHovered ? 'translateX(-2px) rotate(-5deg)' : undefined,
      }}
    >
      {/* Folder tab */}
      <span
        style={{
          content: '""',
          position: 'absolute',
          top: -6,
          left: 3,
          width: 13,
          height: 7,
          background: '#C4704A',
          borderRadius: '3px 3px 0 0',
          opacity: 0.72,
        }}
      />
    </div>
  );
}

// ─── Project card component ─────────

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
        <ProjectFolder logoUrl={project.logo_url} isHovered={hovered} />
      </div>
      <span
        className="font-sans font-medium leading-tight"
        style={{
          fontSize: 9,
          color: '#6a5a4a',
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: 70,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {project.name}
      </span>
    </button>
  );
}

// ─── Main component ─────────────────

export function WindowProjects({ userId }: WindowProjectsProps) {
  const router = useRouter();

  const projects = useProjectsStore((s) => s.projects);
  const fetchProject = useProjectsStore((s) => s.fetchProject);
  const selectedProjectId = useCanvasStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useCanvasStore((s) => s.setSelectedProjectId);

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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

  // Auto-select first project if none selected
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      const firstId = projects[0].id;
      setSelectedProjectId(firstId);
      fetchProject(firstId);
    }
  }, [selectedProjectId, projects, setSelectedProjectId, fetchProject]);

  // Filter projects by search
  const filteredProjects = useMemo(() => {
    if (!debouncedSearch) return projects;
    const q = debouncedSearch.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, debouncedSearch]);

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

  // Suppress unused var — userId is required for future use
  void userId;

  return (
    <div className="flex flex-col gap-[10px]">
      {/* Search */}
      <div
        className="flex items-center gap-[6px]"
        style={{
          background: '#F5F0EA',
          border: '0.5px solid #D4C8B8',
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
        <div
          className="grid grid-cols-2 gap-[6px]"
          style={{
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isActive={project.id === selectedProjectId}
              onClick={() => handleSelectProject(project.id)}
            />
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-[6px]">
        <button
          type="button"
          className="flex-1 cursor-pointer font-sans text-[10px] font-medium"
          style={{
            padding: 6,
            borderRadius: 6,
            border: '0.5px solid #D4C8B8',
            background: 'transparent',
            color: '#6a5a4a',
            transition: 'all 0.13s ease',
          }}
          onClick={() => {
            // Placeholder — archive functionality
          }}
        >
          Archivar
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
