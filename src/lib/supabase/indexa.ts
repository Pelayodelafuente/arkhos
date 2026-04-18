import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type {
  IndexaFund,
  IndexaPosition,
  IndexaTransaction,
  IndexaMonthlyReturn,
  IndexaMonthlyPlan,
  IndexaOverview,
} from '@/types/indexa';

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

export async function getIndexaFunds(userId: string): Promise<IndexaFund[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('indexa_funds')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('fund_type');
  return (data ?? []) as IndexaFund[];
}

export async function getIndexaPositions(userId: string): Promise<IndexaPosition[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('indexa_positions')
    .select('*, fund:indexa_funds(*)')
    .eq('user_id', userId);
  return (data ?? []) as IndexaPosition[];
}

export async function getIndexaTransactions(
  userId: string,
  limit = 200
): Promise<IndexaTransaction[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('indexa_transactions')
    .select('*, fund:indexa_funds(id, name, isin, fund_type, color)')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .limit(limit);
  return (data ?? []) as IndexaTransaction[];
}

export async function getIndexaMonthlyReturns(userId: string): Promise<IndexaMonthlyReturn[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('indexa_monthly_returns')
    .select('*')
    .eq('user_id', userId)
    .order('year', { ascending: true })
    .order('month', { ascending: true });
  return (data ?? []) as IndexaMonthlyReturn[];
}

export async function getIndexaMonthlyPlan(userId: string): Promise<IndexaMonthlyPlan | null> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('indexa_monthly_plan')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  return data as IndexaMonthlyPlan | null;
}

export async function getIndexaOverview(userId: string): Promise<IndexaOverview | null> {
  const [positions, returns] = await Promise.all([
    getIndexaPositions(userId),
    getIndexaMonthlyReturns(userId),
  ]);

  if (positions.length === 0) return null;

  const totalValue = positions.reduce((s, p) => s + p.total_value, 0);
  const totalCost = positions.reduce((s, p) => s + p.total_cost, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  // TWR from last cumulative entry
  const lastReturn = returns.length > 0 ? returns[returns.length - 1] : null;
  const twrPct = lastReturn?.cumulative_twr ?? null;

  // MWR approx — same as simple P&L% for now
  const mwrPct = totalGainPct;

  // Volatility — std dev of monthly returns (annualized)
  const returnValues = returns
    .map((r) => r.return_pct)
    .filter((v): v is number => v !== null);

  let volatilityPct: number | null = null;
  let sharpePct: number | null = null;
  if (returnValues.length >= 3) {
    const mean = returnValues.reduce((s, v) => s + v, 0) / returnValues.length;
    const variance =
      returnValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / returnValues.length;
    const monthlyStd = Math.sqrt(variance);
    volatilityPct = monthlyStd * Math.sqrt(12);
    const riskFreeMonthly = 0;
    sharpePct = monthlyStd > 0 ? ((mean - riskFreeMonthly) / monthlyStd) * Math.sqrt(12) : null;
  }

  // Max drawdown — from cumulative TWR series
  let maxDrawdown: number | null = null;
  const cumValues = returns
    .map((r) => r.cumulative_twr)
    .filter((v): v is number => v !== null);
  if (cumValues.length >= 2) {
    let peak = -Infinity;
    let dd = 0;
    for (const v of cumValues) {
      if (v > peak) peak = v;
      const drawdown = peak > 0 ? (v - peak) / (100 + peak) : 0;
      if (drawdown < dd) dd = drawdown;
    }
    maxDrawdown = dd * 100;
  }

  // Best / worst month
  const bestMonth = returnValues.length > 0 ? Math.max(...returnValues) : null;
  const worstMonth = returnValues.length > 0 ? Math.min(...returnValues) : null;

  const lastPos = positions.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )[0];

  return {
    total_value: totalValue,
    total_cost: totalCost,
    total_gain: totalGain,
    total_gain_pct: totalGainPct,
    twr_pct: twrPct,
    mwr_pct: mwrPct,
    volatility_pct: volatilityPct,
    max_drawdown_pct: maxDrawdown,
    sharpe_ratio: sharpePct,
    best_month_pct: bestMonth,
    worst_month_pct: worstMonth,
    positions_count: positions.filter((p) => p.fund_type !== 'cash').length,
    last_updated: lastPos?.updated_at ?? null,
  };
}

export async function hasIndexaData(userId: string): Promise<boolean> {
  const supabase = await getClient();
  const { count } = await supabase
    .from('indexa_funds')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}

export async function seedIndexaData(userId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getClient();
  const { error } = await supabase.rpc('seed_indexa_for_user', { p_user_id: userId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function upsertIndexaPositions(
  userId: string,
  updates: Array<{
    fund_id: string | null;
    fund_type: string;
    shares: number | null;
    price_per_share: number | null;
    total_value: number;
    total_cost: number;
    allocation_pct: number | null;
  }>
): Promise<void> {
  const supabase = await getClient();
  await supabase.from('indexa_positions').delete().eq('user_id', userId);
  if (updates.length > 0) {
    await supabase
      .from('indexa_positions')
      .insert(updates.map((u) => ({ ...u, user_id: userId })));
  }
}

export async function insertIndexaTransaction(
  userId: string,
  tx: Omit<IndexaTransaction, 'id' | 'user_id' | 'created_at' | 'fund'>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getClient();
  const { error } = await supabase
    .from('indexa_transactions')
    .insert({ ...tx, user_id: userId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
