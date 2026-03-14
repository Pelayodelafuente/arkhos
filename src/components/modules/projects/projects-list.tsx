"use client";

import { useFilteredProjects } from "@/stores/projects-store";
import { ProjectCard } from "./project-card";
import { ProjectsEmpty } from "./projects-empty";

export function ProjectsList() {
  const projects = useFilteredProjects();

  if (projects.length === 0) {
    return <ProjectsEmpty />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
