import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectDetail } from "@/components/modules/projects/project-detail";
import { getProject, getTags } from "@/lib/supabase/projects";
import type { Project, Tag } from "@/types/projects";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Server fetch + hidratación: evita el loading extra al entrar directo a la ruta
  let initialProject: Project | null = null;
  let initialTags: Tag[] = [];
  try {
    [initialProject, initialTags] = await Promise.all([
      getProject(supabase, id),
      getTags(supabase, id),
    ]);
  } catch {
    // Proyecto no encontrado o sin permisos: ProjectDetail reintenta en cliente
  }

  return (
    <ProjectDetail
      projectId={id}
      userId={user.id}
      initialProject={initialProject}
      initialTags={initialTags}
    />
  );
}
