"use client";

import { Search, LayoutList, Columns3 } from "lucide-react";
import { useProjectsStore } from "@/stores/projects-store";
import { PROJECT_STATUSES, PROJECT_STATUS_CONFIG, type ProjectStatus, type ViewMode } from "@/types/projects";

export function ProjectsToolbar() {
  const viewMode = useProjectsStore((s) => s.viewMode);
  const filters = useProjectsStore((s) => s.filters);
  const setViewMode = useProjectsStore((s) => s.setViewMode);
  const setFilters = useProjectsStore((s) => s.setFilters);
  const projects = useProjectsStore((s) => s.projects);

  // Collect all unique tags
  const allTags = Array.from(new Set(projects.flatMap((p) => p.tags))).sort();

  const statusOptions: Array<{ value: ProjectStatus | "all"; label: string }> = [
    { value: "all", label: "Todos" },
    ...PROJECT_STATUSES.map((s) => ({
      value: s,
      label: PROJECT_STATUS_CONFIG[s].label,
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
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Row 2: Status filters + Tag filters */}
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

        {allTags.length > 0 && (
          <>
            <span className="mx-1 h-4 w-px bg-border" />
            <div className="flex flex-wrap gap-1.5 overflow-x-auto">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() =>
                    setFilters({ tag: filters.tag === tag ? null : tag })
                  }
                  className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                    filters.tag === tag
                      ? "bg-foreground text-background"
                      : "bg-sand text-text-secondary hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </>
        )}
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
