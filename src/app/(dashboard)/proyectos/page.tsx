import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectCanvas } from "@/components/modules/projects";
import { getProjects } from "@/lib/supabase/projects";
import type { ProjectListItem } from "@/types/projects";

export default async function ProyectosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Snapshot inicial server-side: si falla, ProjectCanvas hace el fetch cliente.
  let initialProjects: ProjectListItem[] | null = null;
  try {
    initialProjects = await getProjects(supabase, user.id);
  } catch {
    initialProjects = null;
  }

  return <ProjectCanvas userId={user.id} initialProjects={initialProjects} />;
}
