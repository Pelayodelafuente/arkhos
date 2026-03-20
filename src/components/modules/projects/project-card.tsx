"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Progress } from "@/components/ui";
import { ProjectIcon } from "./project-icon";
import { StatusBadge } from "./status-badge";
import type { ProjectListItem } from "@/types/projects";

interface ProjectCardProps {
  project: ProjectListItem;
  searchQuery?: string;
}

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function ProjectCard({ project, searchQuery = "" }: ProjectCardProps) {
  const progress =
    project.task_count > 0
      ? Math.round((project.done_task_count / project.task_count) * 100)
      : 0;

  return (
    <Link href={`/proyectos/${project.id}`}>
      <div className="group rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-[3px] hover:border-accent">
        {/* Header row */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {project.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={project.logo_url}
                alt=""
                className="h-9 w-9 flex-shrink-0 rounded-lg border border-border object-cover transition-transform duration-200 group-hover:scale-105"
              />
            ) : (
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
                style={{ backgroundColor: "rgba(196,112,74,0.1)" }}
              >
                <ProjectIcon icon={project.icon} size={18} className="text-accent" />
              </div>
            )}
            <div>
              <h3 className="font-heading text-base text-foreground transition-colors group-hover:text-accent">
                {highlight(project.name, searchQuery)}
              </h3>
              <p className="text-xs text-text-tertiary">
                {project.type}
                {project.start_date && (
                  <>
                    {" "}
                    <span className="mx-1 text-border">·</span>
                    <span className="font-mono">
                      {new Date(project.start_date).toLocaleDateString("es-ES", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <StatusBadge status={project.status} />
        </div>

        {/* Stack pills */}
        {project.stack.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {project.stack.map((tech) => (
              <span
                key={tech}
                className="rounded-md bg-sand px-2 py-0.5 text-[10px] font-medium text-text-secondary"
              >
                {highlight(tech, searchQuery)}
              </span>
            ))}
          </div>
        )}

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-text-tertiary"
              >
                {highlight(tag, searchQuery)}
              </span>
            ))}
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center gap-3">
          <Progress value={progress} className="flex-1" />
          <span className="w-8 text-right font-mono text-xs text-text-tertiary">
            {progress}%
          </span>
        </div>

        {/* Footer: phase/task counts */}
        <div className="mt-2.5 flex items-center gap-3 text-[11px] text-text-tertiary">
          <span>
            <span className="font-mono font-medium text-text-secondary">
              {project.phase_count}
            </span>{" "}
            fases
          </span>
          <span className="text-border">·</span>
          <span>
            <span className="font-mono font-medium text-text-secondary">
              {project.done_task_count}
            </span>
            /
            <span className="font-mono">{project.task_count}</span> tareas
          </span>
        </div>
      </div>
    </Link>
  );
}
