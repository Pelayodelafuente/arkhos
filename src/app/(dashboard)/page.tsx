import { createClient } from "@/lib/supabase/server"
import { DashboardView } from "@/components/modules/dashboard/dashboard-view"
import type { PlatformData, NoteData } from "@/components/modules/dashboard/dashboard-view"

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
    { data: cryptoAssets },
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
      .limit(20),
    supabase
      .from("portfolio_snapshots")
      .select("snapshot_date, total_value, total_invested")
      .eq("user_id", user.id)
      .order("snapshot_date", { ascending: false })
      .limit(60),
    supabase
      .from("subscriptions")
      .select("id, name, amount, cycle, status, category_id, billing_day, started_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("amount", { ascending: false })
      .limit(20),
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
      .select("symbol, current_price_eur, current_balance, total_invested_eur")
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase
      .from("notes")
      .select("id, title, content, created_at, color")
      .eq("user_id", user.id)
      .eq("archived", false)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(4),
  ])

  // Current value per platform from portfolio_assets (TR ETFs + placeholder assets for Indexa/Horos/Mintos)
  const platformValueMap: Record<string, number> = {}
  for (const asset of assets ?? []) {
    if (!asset.platform_id) continue
    const price = asset.current_price_eur ?? 0
    const qty = asset.current_quantity ?? 0
    platformValueMap[asset.platform_id] = (platformValueMap[asset.platform_id] ?? 0) + price * qty
  }

  // Add crypto total to the 'crypto' platform
  const cryptoTotal = (cryptoAssets ?? []).reduce(
    (sum, a) => sum + (a.current_price_eur ?? 0) * (a.current_balance ?? 0),
    0
  )
  const cryptoPlatform = (platforms ?? []).find((p) => p.slug === "crypto")
  if (cryptoPlatform && cryptoTotal > 0) {
    platformValueMap[cryptoPlatform.id] = (platformValueMap[cryptoPlatform.id] ?? 0) + cryptoTotal
  }

  // Invested per platform from portfolio_assets
  const investedMap: Record<string, number> = {}
  for (const asset of assets ?? []) {
    if (!asset.platform_id) continue
    investedMap[asset.platform_id] = (investedMap[asset.platform_id] ?? 0) + (asset.total_invested ?? 0)
  }
  // Add crypto invested
  if (cryptoPlatform) {
    const cryptoInvested = (cryptoAssets ?? []).reduce(
      (sum, a) => sum + (a.total_invested_eur ?? 0),
      0
    )
    investedMap[cryptoPlatform.id] = (investedMap[cryptoPlatform.id] ?? 0) + cryptoInvested
  }

  const enrichedPlatforms: PlatformData[] = (platforms ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    current_value: platformValueMap[p.id] ?? 0,
    total_invested: investedMap[p.id] ?? 0,
  }))

  // Aggregate snapshots by date (sum across platforms — ready for multi-platform snapshots)
  const snapshotsByDate = new Map<string, { total_value: number; total_invested: number }>()
  for (const s of snapshots ?? []) {
    const existing = snapshotsByDate.get(s.snapshot_date) ?? { total_value: 0, total_invested: 0 }
    snapshotsByDate.set(s.snapshot_date, {
      total_value: existing.total_value + (s.total_value ?? 0),
      total_invested: existing.total_invested + (s.total_invested ?? 0),
    })
  }
  const mappedSnapshots = Array.from(snapshotsByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([snapshot_date, vals]) => ({
      snapshot_date,
      total_value: vals.total_value,
      invested_value: vals.total_invested,
    }))

  const mappedActivity = (activityLog ?? []).map((a) => ({
    ...a,
    created_at: a.created_at ?? new Date().toISOString(),
  }))

  const initialNotes: NoteData[] = (notesData ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content ?? "",
    created_at: n.created_at ?? new Date().toISOString(),
    color: n.color,
  }))

  const btcData = (cryptoAssets ?? []).find((a) => a.symbol === "BTC") ?? null
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
      initialNotes={initialNotes}
      btcPrice={btcPrice}
      btcBalance={btcBalance}
    />
  )
}
