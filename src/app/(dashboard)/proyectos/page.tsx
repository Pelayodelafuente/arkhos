import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectsView } from "@/components/modules/projects";

export default async function ProyectosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <ProjectsView userId={user.id} />;
}
