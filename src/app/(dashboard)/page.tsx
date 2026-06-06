import { createClient } from "@/lib/supabase/server"
import { DashboardView } from "@/components/modules/dashboard/dashboard-view"
import type { PlatformData, NoteData, AssetData } from "@/components/modules/dashboard/dashboard-view"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: activityLog },
    { data: projects },
    { data: snapshots },
    { data: subscriptions },
    { data: platforms },
    { data: assets },
    { data: btcData },
    { data: notesData },
  ] = await Promise.all([
    supabase
      .from("activity_log")
      .select("id, module, action, entity_name, detail, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("projects")
      .select("id, name, icon, status, updated_at, project_phases(id, phase_tasks(id, done))")
      .eq("user_id", user.id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase
      .from("portfolio_snapshots")
      .select("snapshot_date, total_value, total_invested")
      .eq("user_id", user.id)
      .order("snapshot_date", { ascending: false })
      .limit(12),
    supabase
      .from("subscriptions")
      .select("id, name, amount, cycle, status, category_id, billing_day, started_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("amount", { ascending: false })
      .limit(8),
    supabase
      .from("investment_platforms")
      .select("id, name, slug")
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase
      .from("portfolio_assets")
      .select("platform_id, current_quantity, current_price_eur, total_invested")
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase
      .from("crypto_assets")
      .select("symbol, current_price_eur, current_balance")
      .eq("user_id", user.id)
      .eq("symbol", "BTC")
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("notes")
      .select("id, title, content, created_at, color")
      .eq("user_id", user.id)
      .eq("archived", false)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(4),
  ])

  const platformValueMap: Record<string, number> = {}
  for (const asset of assets ?? []) {
    if (!asset.platform_id) continue
    const price = asset.current_price_eur ?? 0
    const qty = asset.current_quantity ?? 0
    platformValueMap[asset.platform_id] =
      (platformValueMap[asset.platform_id] ?? 0) + price * qty
  }

  const enrichedPlatforms: PlatformData[] = (platforms ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    current_value: platformValueMap[p.id] ?? 0,
  }))

  const mappedSnapshots = (snapshots ?? []).reverse().map((s) => ({
    snapshot_date: s.snapshot_date,
    total_value: s.total_value,
    invested_value: s.total_invested,
  }))

  const mappedActivity = (activityLog ?? []).map((a) => ({
    ...a,
    created_at: a.created_at ?? new Date().toISOString(),
  }))

  const initialAssets: AssetData[] = (assets ?? []).map((a) => ({
    platform_id: a.platform_id,
    current_quantity: a.current_quantity ?? 0,
    current_price_eur: a.current_price_eur,
    total_invested: a.total_invested ?? 0,
  }))

  const initialNotes: NoteData[] = (notesData ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content ?? "",
    created_at: n.created_at ?? new Date().toISOString(),
    color: n.color,
  }))

  const btcPrice = btcData?.current_price_eur ?? null
  const btcBalance = btcData?.current_balance ?? null

  const userName = user.email?.split("@")[0] ?? "Pelayo"

  return (
    <DashboardView
      userName={userName}
      initialActivity={mappedActivity}
      initialProjects={projects ?? []}
      initialSnapshots={mappedSnapshots}
      initialSubscriptions={subscriptions ?? []}
      initialPlatforms={enrichedPlatforms}
      initialAssets={initialAssets}
      initialNotes={initialNotes}
      btcPrice={btcPrice}
      btcBalance={btcBalance}
    />
  )
}
