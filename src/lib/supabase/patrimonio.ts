import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type {
  InvestmentPlatform,
  PortfolioAsset,
  PortfolioTransaction,
  SavingsPlanItem,
  PortfolioSnapshot,
  PassiveIncome,
  PortfolioOverview,
  PlatformSummary,
} from '@/types/patrimonio';

function computeAssetFields(asset: PortfolioAsset): PortfolioAsset {
  const currentPriceEur = asset.current_price_eur ?? asset.current_price ?? 0;
  const currentValue = currentPriceEur * asset.current_quantity;
  const plAmount = currentValue - asset.total_invested;
  const plPercentage = asset.total_invested > 0 ? (plAmount / asset.total_invested) * 100 : 0;
  return { ...asset, current_value: currentValue, pl_amount: plAmount, pl_percentage: plPercentage };
}

async function getClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export async function getPlatforms(userId: string): Promise<InvestmentPlatform[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from('investment_platforms')
    .select('id, user_id, name, slug, color, icon, is_active, sort_order, notes, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('sort_order');
  if (error) return [];
  return (data ?? []) as InvestmentPlatform[];
}

export async function getAllAssets(userId: string): Promise<PortfolioAsset[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from('portfolio_assets')
    .select(
      'id, user_id, platform_id, name, ticker, isin, category, risk_level, sector, geographic_region, currency, current_quantity, avg_buy_price, total_invested, current_price, current_price_eur, price_updated_at, is_active, notes, sort_order, created_at, updated_at'
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('sort_order');
  if (error) return [];
  return ((data ?? []) as PortfolioAsset[]).map(computeAssetFields);
}

export interface AssetPricePoint {
  isin: string;
  price_date: string;
  price_eur: number;
}

/** Histórico de precios por activo (tabla asset_price_history, ~mensual). */
export async function getAssetPriceHistory(userId: string): Promise<AssetPricePoint[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from('asset_price_history')
    .select('isin, price_date, price_eur')
    .eq('user_id', userId)
    .order('price_date', { ascending: true });
  if (error) return [];
  return ((data ?? []) as Array<{ isin: string; price_date: string; price_eur: number | string }>).map(
    (r) => ({ isin: r.isin, price_date: r.price_date, price_eur: Number(r.price_eur) })
  );
}

export async function getAssetsByPlatform(
  userId: string,
  platformId: string
): Promise<PortfolioAsset[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from('portfolio_assets')
    .select(
      'id, user_id, platform_id, name, ticker, isin, category, risk_level, sector, geographic_region, currency, current_quantity, avg_buy_price, total_invested, current_price, current_price_eur, price_updated_at, is_active, notes, sort_order, created_at, updated_at'
    )
    .eq('user_id', userId)
    .eq('platform_id', platformId)
    .eq('is_active', true)
    .order('sort_order');
  if (error) return [];
  return ((data ?? []) as PortfolioAsset[]).map(computeAssetFields);
}

export async function getPortfolioOverview(userId: string): Promise<PortfolioOverview | null> {
  const platforms = await getPlatforms(userId);
  if (platforms.length === 0) return null;

  const allAssets = await getAllAssets(userId);
  const savingsPlan = await getSavingsPlan(userId);
  const planByAsset = new Map(savingsPlan.map((item) => [item.asset_id, item.monthly_amount]));

  // Attach plan amounts to assets
  const assetsWithPlan = allAssets.map((a) => ({
    ...a,
    monthly_plan_amount: planByAsset.get(a.id),
  }));

  let totalValue = 0;
  let totalInvested = 0;
  let totalCash = 0;

  const platformSummaries: PlatformSummary[] = platforms.map((platform) => {
    const platformAssets = assetsWithPlan.filter((a) => a.platform_id === platform.id);
    const cashAssets = platformAssets.filter((a) => a.category === 'cash');
    const valueAssets = platformAssets.filter((a) => a.category !== 'cash');

    const cashValue = cashAssets.reduce((sum, a) => sum + (a.current_value ?? 0), 0);
    const assetsValue = valueAssets.reduce((sum, a) => sum + (a.current_value ?? 0), 0);
    const platformValue = cashValue + assetsValue;
    const platformInvested = platformAssets.reduce((sum, a) => sum + a.total_invested, 0);
    const plAmount = platformValue - platformInvested;
    const plPercentage = platformInvested > 0 ? (plAmount / platformInvested) * 100 : 0;

    totalValue += platformValue;
    totalInvested += platformInvested;
    totalCash += cashValue;

    return {
      platform,
      total_value: platformValue,
      total_invested: platformInvested,
      cash_value: cashValue,
      pl_amount: plAmount,
      pl_percentage: plPercentage,
      asset_count: platformAssets.length,
      assets: platformAssets,
    };
  });

  const plAmount = totalValue - totalInvested;
  // Exclude cash from denominator: cash always has P&L=0 and inflates invested base artificially
  const nonCashInvested = totalInvested - totalCash;
  const plPercentage = nonCashInvested > 0 ? (plAmount / nonCashInvested) * 100 : 0;

  return {
    total_value: totalValue,
    total_invested: totalInvested,
    total_cash: totalCash,
    pl_amount: plAmount,
    pl_percentage: plPercentage,
    platforms: platformSummaries,
    last_updated: new Date().toISOString(),
  };
}

export async function getAllTransactions(
  userId: string,
  limit = 50
): Promise<PortfolioTransaction[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from('portfolio_transactions')
    .select(
      'id, user_id, asset_id, platform_id, type, transaction_date, quantity, price_per_unit, total_amount, currency, notes, source, external_id, created_at'
    )
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as PortfolioTransaction[];
}

export async function getTransactionsByAsset(
  userId: string,
  assetId: string
): Promise<PortfolioTransaction[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from('portfolio_transactions')
    .select(
      'id, user_id, asset_id, platform_id, type, transaction_date, quantity, price_per_unit, total_amount, currency, notes, source, external_id, created_at'
    )
    .eq('user_id', userId)
    .eq('asset_id', assetId)
    .order('transaction_date', { ascending: false });
  if (error) return [];
  return (data ?? []) as PortfolioTransaction[];
}

export async function getSavingsPlan(userId: string): Promise<SavingsPlanItem[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from('savings_plan_items')
    .select(
      'id, user_id, asset_id, monthly_amount, is_active, execution_day, started_at, ended_at, notes, sort_order, created_at, updated_at'
    )
    .eq('user_id', userId)
    .order('is_active', { ascending: false })
    .order('sort_order');
  if (error) return [];
  return (data ?? []) as SavingsPlanItem[];
}

export async function getSnapshots(userId: string): Promise<PortfolioSnapshot[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select(
      'id, user_id, snapshot_date, platform_id, total_value, total_invested, cash_value, pl_amount, pl_percentage, created_at'
    )
    .eq('user_id', userId)
    // Las filas globales (platform_id NULL) viven aparte — ver getDailyGlobalSnapshots.
    // Los charts de TR consumen este listado sin filtrar por plataforma.
    .not('platform_id', 'is', null)
    .order('snapshot_date');
  if (error) return [];
  return (data ?? []) as PortfolioSnapshot[];
}

/** Serie diaria del patrimonio GLOBAL (filas platform_id NULL del cron diario). */
export async function getDailyGlobalSnapshots(userId: string): Promise<PortfolioSnapshot[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select(
      'id, user_id, snapshot_date, platform_id, total_value, total_invested, cash_value, pl_amount, pl_percentage, created_at'
    )
    .eq('user_id', userId)
    .is('platform_id', null)
    .order('snapshot_date');
  if (error) return [];
  return (data ?? []) as PortfolioSnapshot[];
}

export async function getPassiveIncome(userId: string): Promise<PassiveIncome[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from('passive_income')
    .select(
      'id, user_id, asset_id, platform_id, type, income_date, amount, currency, notes, created_at'
    )
    .eq('user_id', userId)
    .order('income_date', { ascending: false });
  if (error) return [];
  return (data ?? []) as PassiveIncome[];
}

export async function updateAssetPrice(
  assetId: string,
  price: number,
  priceEur: number
): Promise<void> {
  const supabase = await getClient();
  await supabase
    .from('portfolio_assets')
    .update({
      current_price: price,
      current_price_eur: priceEur,
      price_updated_at: new Date().toISOString(),
    })
    .eq('id', assetId);
}

export async function updatePlatformValue(
  userId: string,
  platformId: string,
  totalValue: number
): Promise<void> {
  const supabase = await getClient();
  // Update the placeholder asset that represents the platform total
  await supabase
    .from('portfolio_assets')
    .update({
      current_price: totalValue,
      current_price_eur: totalValue,
      price_updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('platform_id', platformId)
    .in('category', ['fund', 'p2p']);
}

export async function hasPlatforms(userId: string): Promise<boolean> {
  const supabase = await getClient();
  const { count } = await supabase
    .from('investment_platforms')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}
