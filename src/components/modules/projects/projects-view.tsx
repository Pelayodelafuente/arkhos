"use client";

import { useEffect, useState } from "react";
import { useProjectsStore } from "@/stores/projects-store";
import { useUIStore } from "@/stores/ui-store";
import { ProjectsHeader } from "./projects-header";
import { ProjectsToolbar } from "./projects-toolbar";
import { ProjectsList } from "./projects-list";
import { ProjectsKanban } from "./projects-kanban";
import { ProjectsLoading } from "./projects-loading";
import { ProjectModal } from "./project-modal";
import { ActivityFeed } from "./activity-feed";

interface ProjectsViewProps {
  userId: string;
}

export function ProjectsView({ userId }: ProjectsViewProps) {
  const projects = useProjectsStore((s) => s.projects);
  const loading = useProjectsStore((s) => s.loading);
  const viewMode = useProjectsStore((s) => s.viewMode);
  const fetchProjects = useProjectsStore((s) => s.fetchProjects);
  const openModal = useUIStore((s) => s.openModal);

  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    fetchProjects(userId).then(() => setInitialLoad(false));
  }, [userId, fetchProjects]);

  return (
    <div>
      <ProjectsHeader
        projects={projects}
        onNewProject={() => openModal("new-project")}
      />
      <ProjectsToolbar />

      {initialLoad && loading ? (
        <ProjectsLoading />
      ) : viewMode === "kanban" ? (
        <ProjectsKanban />
      ) : (
        <ProjectsList />
      )}

      <ActivityFeed userId={userId} />
      <ProjectModal userId={userId} />
    </div>
  );
}
