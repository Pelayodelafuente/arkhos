"use client";

import { useEffect, useState } from "react";
import { useProjectsStore } from "@/stores/projects-store";
import { useUIStore } from "@/stores/ui-store";
import { createClient } from "@/lib/supabase/client";
import { getProjectTypes, getProjectStatuses, seedUserDefaults } from "@/lib/supabase/projects";
import { DEFAULT_PROJECT_TYPES, DEFAULT_PROJECT_STATUSES } from "@/types/projects";
import type { ProjectTypeRecord, ProjectStatusRecord } from "@/types/projects";
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
  const [projectTypes, setProjectTypes] = useState<ProjectTypeRecord[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatusRecord[]>([]);

  useEffect(() => {
    async function load() {
      const client = createClient();

      // Seed defaults if first time
      await seedUserDefaults(client, userId, {
        types: DEFAULT_PROJECT_TYPES,
        statuses: DEFAULT_PROJECT_STATUSES,
      });

      const [types, statuses] = await Promise.all([
        getProjectTypes(client, userId),
        getProjectStatuses(client, userId),
      ]);

      setProjectTypes(types);
      setProjectStatuses(statuses);
      await fetchProjects(userId);
      setInitialLoad(false);
    }

    load();
  }, [userId, fetchProjects]);

  return (
    <div>
      <ProjectsHeader
        projects={projects}
        onNewProject={() => openModal("new-project")}
      />
      <ProjectsToolbar statuses={projectStatuses} />

      {initialLoad && loading ? (
        <ProjectsLoading />
      ) : viewMode === "kanban" ? (
        <ProjectsKanban statuses={projectStatuses} />
      ) : (
        <ProjectsList />
      )}

      <ActivityFeed userId={userId} />
      <ProjectModal
        userId={userId}
        projectTypes={projectTypes}
        projectStatuses={projectStatuses}
        onTypesChange={setProjectTypes}
        onStatusesChange={setProjectStatuses}
      />
    </div>
  );
}
