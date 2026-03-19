"use client";

import { useEffect, useState } from "react";
import { Search, LayoutList, Columns3 } from "lucide-react";
import { useProjectsStore } from "@/stores/projects-store";
import type { ProjectStatusRecord } from "@/types/projects";

interface ProjectsToolbarProps {
  statuses: ProjectStatusRecord[];
}

export function ProjectsToolbar({ statuses }: ProjectsToolbarProps) {
  const viewMode = useProjectsStore((s) => s.viewMode);
  const filters = useProjectsStore((s) => s.filters);
  const setViewMode = useProjectsStore((s) => s.setViewMode);
  const setFilters = useProjectsStore((s) => s.setFilters);

  const [localSearch, setLocalSearch] = useState(filters.search);

  useEffect(() => {
    const t = setTimeout(() => setFilters({ search: localSearch }), 300);
    return () => clearTimeout(t);
  }, [localSearch, setFilters]);

  const statusOptions: Array<{ value: string; label: string; color: string }> = [
    { value: "all", label: "Todos", color: "#6B6F62" },
    ...statuses.map((s) => ({
      value: s.name,
      label: s.name,
      color: s.color,
    })),
  ];

  return (
    <div className="mb-6 space-y-3">
      {/* Row 1: View toggle + Search */}
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
