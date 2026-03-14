"use client";

import { useProjectsByStatus } from "@/stores/projects-store";
import { PROJECT_STATUS_CONFIG, type ProjectStatus } from "@/types/projects";
import { ProjectCard } from "./project-card";

const COLUMNS: ProjectStatus[] = ["idea", "active", "paused", "done"];

export function ProjectsKanban() {
  const byStatus = useProjectsByStatus();

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((status) => {
        const config = PROJECT_STATUS_CONFIG[status];
        const items = byStatus[status];

        return (
          <div
            key={status}
            className="w-72 flex-shrink-0 rounded-xl border border-border bg-sand/40 p-3"
          >
            {/* Column header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-sm font-medium text-foreground">
                  {config.label}
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
              <KanbanEmpty status={status} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function KanbanEmpty({ status }: { status: ProjectStatus }) {
  const messages: Record<ProjectStatus, string> = {
    idea: "Las ideas empiezan aqui",
    active: "Nada en progreso",
    paused: "Sin proyectos pausados",
    done: "Completa tu primer proyecto",
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8">
      <p className="font-heading text-sm text-text-tertiary">{messages[status]}</p>
    </div>
  );
}
