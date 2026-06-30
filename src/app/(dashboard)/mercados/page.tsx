import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MercadosView } from "./_components/MercadosView";

export default async function MercadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <MercadosView />;
}
