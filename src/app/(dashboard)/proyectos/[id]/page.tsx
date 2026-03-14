import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectDetail } from "@/components/modules/projects/project-detail";

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

  return <ProjectDetail projectId={id} userId={user.id} />;
}
