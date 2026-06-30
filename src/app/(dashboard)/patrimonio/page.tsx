import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PatrimonioGate } from "@/components/modules/patrimonio/PatrimonioGate";

export default async function PatrimonioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <PatrimonioGate />;
}
