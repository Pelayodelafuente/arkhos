import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { DashboardView } from "@/components/modules/dashboard/dashboard-view"
import type { PlatformData, NoteData, MarketData } from "@/components/modules/dashboard/dashboard-view"

interface CoinGeckoPrice {
  eur?: number
  usd?: number
  eur_24h_change?: number
}
interface CoinGeckoResponse {
  bitcoin?: CoinGeckoPrice
  ethereum?: CoinGeckoPrice
}
interface FearGreedItem {
  value: string
  value_classification: string
}
interface FearGreedResponse {
  data?: FearGreedItem[]
}
interface CacheRow {
  metric: string
  value: { current?: number; label?: string } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [
    [
      { data: activityLog },
      { data: projects },
      { data: snapshots },
      { data: subscriptions },
      { data: platforms },
      { data: assets },
      { data: cryptoAssets },
      { data: notesData },
      { data: horosData },
      { data: mintosData },
      { data: indexaPositions },
    ],
    [cgRaw, fngRaw],
  ] = await Promise.all([
    Promise.all([
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
        .eq("user_id", user.id),
      // category included to separate cash from invested positions
      supabase
        .from("portfolio_assets")
        .select("platform_id, current_quantity, current_price_eur, total_invested, category")
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
      supabase
        .from("horos_position")
        .select("total_value, total_cost")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("mintos_overview")
        .select("total_value, net_gain")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("indexa_positions")
        .select("total_value, total_cost")
        .eq("user_id", user.id),
    ]),
    Promise.all([
      fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=eur,usd&include_24hr_change=true",
        { next: { revalidate: 300 } }
      )
        .then((r): Promise<CoinGeckoResponse | null> =>
          r.ok ? r.json() : Promise.resolve(null)
        )
        .catch(() => null),
      fetch("https://api.alternative.me/fng/?limit=1", {
        next: { revalidate: 3600 },
      })
        .then((r): Promise<FearGreedResponse | null> =>
          r.ok ? r.json() : Promise.resolve(null)
        )
        .catch(() => null),
    ]),
  ])

  // ─── Market cache (VIX, US 10Y, EUR/USD, DXY, Gold) ──────────────────────
  // Read from market_data_cache populated by the Mercados module
  let cacheMap: Record<string, number | null> = {}
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      const { data: cacheRows } = await admin
        .from("market_data_cache")
        .select("metric, value")
        .in("metric", ["vix", "us10y", "eurusd", "dxy", "gold"])
      for (const row of (cacheRows ?? []) as CacheRow[]) {
        const v = row.value?.current ?? null
        cacheMap[row.metric] = typeof v === "number" ? v : null
      }
    }
  } catch {
    // Cache unavailable — values remain null
  }

  // ─── Platform values ───────────────────────────────────────────────────────
  const platformValueMap: Record<string, number> = {}
  const investedMap: Record<string, number> = {}
  const cashValueMap: Record<string, number> = {}

  for (const asset of assets ?? []) {
    if (!asset.platform_id) continue
    const price = asset.current_price_eur ?? 0
    const qty = asset.current_quantity ?? 0
    const val = price * qty
    platformValueMap[asset.platform_id] = (platformValueMap[asset.platform_id] ?? 0) + val
    investedMap[asset.platform_id] = (investedMap[asset.platform_id] ?? 0) + (asset.total_invested ?? 0)
    // Track cash separately — same logic as patrimonio module
    if (asset.category === "cash") {
      cashValueMap[asset.platform_id] = (cashValueMap[asset.platform_id] ?? 0) + val
    }
  }

  const platformBySlug = new Map((platforms ?? []).map((p) => [p.slug, p]))

  const horosPlatform = platformBySlug.get("horos")
  if (horosPlatform && horosData) {
    platformValueMap[horosPlatform.id] = horosData.total_value ?? 0
    investedMap[horosPlatform.id] = horosData.total_cost ?? 0
  }

  const mintosPlatform = platformBySlug.get("mintos")
  if (mintosPlatform && mintosData?.total_value) {
    platformValueMap[mintosPlatform.id] = mintosData.total_value
    investedMap[mintosPlatform.id] = mintosData.total_value - (mintosData.net_gain ?? 0)
  }

  const indexaPlatform = platformBySlug.get("indexa")
  if (indexaPlatform && indexaPositions && indexaPositions.length > 0) {
    platformValueMap[indexaPlatform.id] = indexaPositions.reduce((s, p) => s + (p.total_value ?? 0), 0)
    investedMap[indexaPlatform.id] = indexaPositions.reduce((s, p) => s + (p.total_cost ?? 0), 0)
  }

  const cryptoTotal = (cryptoAssets ?? []).reduce(
    (sum, a) => sum + (a.current_price_eur ?? 0) * (a.current_balance ?? 0),
    0
  )
  const cryptoPlatform = platformBySlug.get("crypto")
  if (cryptoPlatform && cryptoTotal > 0) {
    platformValueMap[cryptoPlatform.id] = cryptoTotal
    investedMap[cryptoPlatform.id] = (cryptoAssets ?? []).reduce(
      (sum, a) => sum + (a.total_invested_eur ?? 0),
      0
    )
  }

  const enrichedPlatforms: PlatformData[] = (platforms ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    current_value: platformValueMap[p.id] ?? 0,
    total_invested: investedMap[p.id] ?? 0,
    cash_value: cashValueMap[p.id] ?? 0,
  }))

  // ─── Snapshots ────────────────────────────────────────────────────────────
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

  // ─── Market data ──────────────────────────────────────────────────────────
  const cg = cgRaw as CoinGeckoResponse | null
  const fng = (fngRaw as FearGreedResponse | null)?.data?.[0] ?? null

  const btcEur = cg?.bitcoin?.eur ?? null
  const btcUsd = cg?.bitcoin?.usd ?? null
  const cgEurUsd = btcEur && btcUsd ? Math.round((btcUsd / btcEur) * 10000) / 10000 : null

  const marketData: MarketData = {
    btcChange24h: cg?.bitcoin?.eur_24h_change ?? null,
    ethPrice: cg?.ethereum?.eur ?? null,
    ethChange24h: cg?.ethereum?.eur_24h_change ?? null,
    fearGreed: fng
      ? { value: Number(fng.value), label: fng.value_classification }
      : null,
    // Prefer ExchangeRate cache; fall back to BTC cross-rate
    eurUsd: (cacheMap["eurusd"] ?? null) ?? cgEurUsd,
    vix: cacheMap["vix"] ?? null,
    us10y: cacheMap["us10y"] ?? null,
    dxy: cacheMap["dxy"] ?? null,
    gold: cacheMap["gold"] ?? null,
  }

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
      marketData={marketData}
    />
  )
}
