"use client";

import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import type { ProjectListItem } from "@/types/projects";

interface ProjectsHeaderProps {
  projects: ProjectListItem[];
  onNewProject: () => void;
}

export function ProjectsHeader({ projects, onNewProject }: ProjectsHeaderProps) {
  const total = projects.length;
  const active = projects.filter((p) => p.status === "active").length;
  const done = projects.filter((p) => p.status === "done").length;

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent">
          <FolderKanban size={20} strokeWidth={1.75} className="text-white" />
        </div>
        <div>
          <h1 className="font-heading text-2xl text-foreground">Proyectos</h1>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-text-tertiary">
            <span>
              <span className="font-mono font-medium text-foreground">{total}</span> total
            </span>
            <span className="text-border">|</span>
            <span>
              <span className="font-mono font-medium text-foreground">{active}</span> activos
            </span>
            <span className="text-border">|</span>
            <span>
              <span className="font-mono font-medium text-foreground">{done}</span> completados
            </span>
          </div>
        </div>
      </div>
      <Button onClick={onNewProject} size="sm">
        <Plus size={16} strokeWidth={2} />
        Nuevo proyecto
      </Button>
    </div>
  );
}
