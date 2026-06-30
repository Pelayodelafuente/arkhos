import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectCanvas } from "@/components/modules/projects";

export default async function ProyectosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <ProjectCanvas userId={user.id} />;
}
