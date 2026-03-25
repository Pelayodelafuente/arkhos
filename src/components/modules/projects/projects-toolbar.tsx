"use client";

import { useEffect, useRef, useState } from "react";
import { Search, LayoutList, Columns3, ArrowUpDown, Check } from "lucide-react";
import { useProjectsStore } from "@/stores/projects-store";
import type { ProjectStatusRecord, ProjectSortBy } from "@/types/projects";

const SORT_OPTIONS: Array<{ value: ProjectSortBy; label: string }> = [
  { value: "recent", label: "Más reciente" },
  { value: "name", label: "Nombre A-Z" },
  { value: "progress", label: "Progreso" },
  { value: "urgent", label: "Activos primero" },
];

interface ProjectsToolbarProps {
  statuses: ProjectStatusRecord[];
}

export function ProjectsToolbar({ statuses }: ProjectsToolbarProps) {
  const viewMode = useProjectsStore((s) => s.viewMode);
  const filters = useProjectsStore((s) => s.filters);
  const setViewMode = useProjectsStore((s) => s.setViewMode);
  const setFilters = useProjectsStore((s) => s.setFilters);
  const projects = useProjectsStore((s) => s.projects);
  const hasArchived = projects.some((p) => p.status === "Archivado");

  const [localSearch, setLocalSearch] = useState(filters.search);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setFilters({ search: localSearch }), 300);
    return () => clearTimeout(t);
  }, [localSearch, setFilters]);

  // Close sort dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    if (sortOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [sortOpen]);

  const statusOptions: Array<{ value: string; label: string; color: string }> = [
    { value: "all", label: "Todos", color: "#888780" },
    ...statuses.map((s) => ({
      value: s.name,
      label: s.name,
      color: s.color,
    })),
    ...(hasArchived ? [{ value: "Archivado", label: "Archivados", color: "#888780" }] : []),
  ];

  return (
    <div className="mb-6 space-y-3">
      {/* Row 1: View toggle + Search + Sort */}
      <div className="flex items-center gap-3">
        {/* View mode pills */}
        <div className="flex items-center rounded-md border border-border bg-card p-0.5">
          <ViewPill
            active={viewMode === "list"}
            onClick={() => setViewMode("list")}
            icon={<LayoutList size={15} strokeWidth={1.75} />}
            label="Lista"
          />
          <ViewPill
            active={viewMode === "kanban"}
            onClick={() => setViewMode("kanban")}
            icon={<Columns3 size={15} strokeWidth={1.75} />}
            label="Kanban"
          />
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={15}
            strokeWidth={1.75}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            placeholder="Buscar proyecto..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>

        {/* Sort dropdown */}
        <div ref={sortRef} className="relative">
          <button
            onClick={() => setSortOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
              sortOpen
                ? "border-accent bg-card text-accent"
                : "border-border bg-card text-text-secondary hover:border-accent hover:text-accent"
            }`}
          >
            <ArrowUpDown size={15} strokeWidth={1.75} />
            <span className="hidden sm:inline">
              {SORT_OPTIONS.find((o) => o.value === filters.sortBy)?.label ?? "Ordenar"}
            </span>
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-border bg-card shadow-modal">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setFilters({ sortBy: opt.value });
                    setSortOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-sand ${
                    filters.sortBy === opt.value
                      ? "font-medium text-accent"
                      : "text-text-secondary"
                  }`}
                >
                  {opt.label}
                  {filters.sortBy === opt.value && (
                    <Check size={14} strokeWidth={2} className="text-accent" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Status filters */}
      <div className="flex flex-wrap items-center gap-2">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilters({ status: opt.value })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filters.status === opt.value
                ? "bg-accent text-white"
                : "border border-border bg-card text-text-secondary hover:border-accent hover:text-accent"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── View pill sub-component ──────────

function ViewPill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-accent text-white"
          : "text-text-secondary hover:text-foreground"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
