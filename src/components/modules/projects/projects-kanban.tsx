"use client";

import { useProjectsByStatus } from "@/stores/projects-store";
import type { ProjectStatusRecord } from "@/types/projects";
import { ProjectCard } from "./project-card";

interface ProjectsKanbanProps {
  statuses: ProjectStatusRecord[];
}

export function ProjectsKanban({ statuses }: ProjectsKanbanProps) {
  const byStatus = useProjectsByStatus(statuses.map((s) => s.name));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statuses.map((statusRecord) => {
        const items = byStatus[statusRecord.name] ?? [];

        return (
          <div
            key={statusRecord.id}
            className="w-72 flex-shrink-0 rounded-xl border border-border bg-sand/40 p-3"
          >
            {/* Column header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: statusRecord.color }}
                />
                <span className="text-sm font-medium text-foreground">
                  {statusRecord.name}
                </span>
              </div>
              <span className="rounded-full bg-card px-2 py-0.5 font-mono text-[10px] text-text-tertiary">
                {items.length}
              </span>
            </div>

            {/* Cards */}
            {items.length > 0 ? (
              <div className="space-y-3">
                {items.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8">
                <p className="font-heading text-sm text-text-tertiary">Sin proyectos</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
