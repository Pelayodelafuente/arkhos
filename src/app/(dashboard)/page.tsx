import { createClient } from "@/lib/supabase/server"
import { DashboardView } from "@/components/modules/dashboard/dashboard-view"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const userName = user.email?.split("@")[0] ?? "Pelayo"

  return <DashboardView userName={userName} />
}
