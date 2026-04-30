import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MercadosView } from "./_components/MercadosView";
import type { MercadosTab } from "@/stores/mercados-store";

const VALID_TABS: MercadosTab[] = ["pulse", "macro", "assets", "portfolio"];

export default async function MercadosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const tab = VALID_TABS.includes(params.tab as MercadosTab)
    ? (params.tab as MercadosTab)
    : "pulse";

  return <MercadosView userId={user.id} initialTab={tab} />;
}
