"use client";

import { useFilteredProjects, useProjectsStore } from "@/stores/projects-store";
import { ProjectCard } from "./project-card";
import { ProjectsEmpty } from "./projects-empty";

export function ProjectsList() {
  const projects = useFilteredProjects();
  const searchQuery = useProjectsStore((s) => s.filters.search);

  if (projects.length === 0) {
    return <ProjectsEmpty searchQuery={searchQuery || undefined} />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} searchQuery={searchQuery} />
      ))}
    </div>
  );
}
