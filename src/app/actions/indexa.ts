'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type {
  IndexaFund,
  IndexaPosition,
  IndexaTransaction,
  IndexaMonthlyReturn,
  IndexaMonthlyPlan,
  IndexaOverview,
} from '@/types/indexa';

async function createClient() {
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

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// ── Full data load for IndexaSection ────────────────────────────────────────

export interface IndexaFullData {
  funds: IndexaFund[];
  positions: IndexaPosition[];
  transactions: IndexaTransaction[];
  monthlyReturns: IndexaMonthlyReturn[];
  plan: IndexaMonthlyPlan | null;
  overview: IndexaOverview | null;
}

export async function loadIndexaData(): Promise<IndexaFullData | null> {
  const { supabase, user } = await getAuthUser();
  if (!user) return null;

  const [fundsRes, positionsRes, txRes, returnsRes, planRes] = await Promise.all([
    supabase
      .from('indexa_funds')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('fund_type'),
    supabase
      .from('indexa_positions')
      .select('*, fund:indexa_funds(*)')
      .eq('user_id', user.id),
    supabase
      .from('indexa_transactions')
      .select('*, fund:indexa_funds(id, name, isin, fund_type, color)')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(200),
    supabase
      .from('indexa_monthly_returns')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: true })
      .order('month', { ascending: true }),
    supabase
      .from('indexa_monthly_plan')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  const funds = (fundsRes.data ?? []) as IndexaFund[];
  const positions = (positionsRes.data ?? []) as IndexaPosition[];
  const transactions = (txRes.data ?? []) as IndexaTransaction[];
  const monthlyReturns = (returnsRes.data ?? []) as IndexaMonthlyReturn[];
  const plan = planRes.data as IndexaMonthlyPlan | null;

  const overview = computeOverview(positions, monthlyReturns);

  return { funds, positions, transactions, monthlyReturns, plan, overview };
}

// ── Compute overview from raw data (mirrors indexa.ts logic) ────────────────

function computeOverview(
  positions: IndexaPosition[],
  returns: IndexaMonthlyReturn[]
): IndexaOverview | null {
  if (positions.length === 0) return null;

  const totalValue = positions.reduce((s, p) => s + p.total_value, 0);
  const totalCost = positions.reduce((s, p) => s + p.total_cost, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const lastReturn = returns.length > 0 ? returns[returns.length - 1] : null;
  const twrPct = lastReturn?.cumulative_twr ?? null;
  const mwrPct = totalGainPct;

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
    sharpePct = monthlyStd > 0 ? ((mean / monthlyStd) * Math.sqrt(12)) : null;
  }

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

  const bestMonth = returnValues.length > 0 ? Math.max(...returnValues) : null;
  const worstMonth = returnValues.length > 0 ? Math.min(...returnValues) : null;

  const lastPos = [...positions].sort(
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

// ── Register contribution ────────────────────────────────────────────────────

export interface RegisterContributionInput {
  fundId: string | null;
  date: string;
  amount: number;
  shares: number | null;
  pricePerShare: number | null;
  notes: string;
}

export async function registerIndexaContribution(
  input: RegisterContributionInput
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { error } = await supabase.from('indexa_transactions').insert({
    user_id: user.id,
    fund_id: input.fundId,
    transaction_date: input.date,
    type: 'subscription',
    shares: input.shares,
    price_per_share: input.pricePerShare,
    amount: input.amount,
    notes: input.notes || null,
    source: 'manual',
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/patrimonio');
  return { ok: true };
}

// ── Import CSV transactions ─────────────────────────────────────────────────

export interface CSVImportRow {
  fundId: string | null;
  transaction_date: string;
  value_date: string | null;
  type: 'subscription' | 'redemption' | 'transfer_in' | 'transfer_out';
  shares: number | null;
  price_per_share: number | null;
  amount: number;
  notes: string | null;
}

export async function importIndexaCSV(
  rows: CSVImportRow[]
): Promise<{ ok: boolean; imported: number; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { ok: false, imported: 0, error: 'No autenticado' };

  const records = rows.map((r) => ({
    user_id: user.id,
    fund_id: r.fundId,
    transaction_date: r.transaction_date,
    value_date: r.value_date,
    type: r.type,
    shares: r.shares,
    price_per_share: r.price_per_share,
    amount: r.amount,
    notes: r.notes,
    source: 'import_csv' as const,
  }));

  const { error, count } = await supabase
    .from('indexa_transactions')
    .insert(records, { count: 'exact' });

  if (error) return { ok: false, imported: 0, error: error.message };
  revalidatePath('/patrimonio');
  return { ok: true, imported: count ?? rows.length };
}

// ── Update fund prices manually ─────────────────────────────────────────────

export interface UpdateIndexaPriceInput {
  positionId: string;
  pricePerShare: number;
  shares: number;
  totalCost: number;
}

export async function updateIndexaPrices(
  updates: UpdateIndexaPriceInput[]
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const now = new Date().toISOString();

  for (const u of updates) {
    const totalValue = u.shares * u.pricePerShare;
    const { error } = await supabase
      .from('indexa_positions')
      .update({
        price_per_share: u.pricePerShare,
        total_value: totalValue,
        updated_at: now,
      })
      .eq('id', u.positionId)
      .eq('user_id', user.id);

    if (error) return { ok: false, error: error.message };
  }

  revalidatePath('/patrimonio');
  return { ok: true };
}

// ── Seed for onboarding ─────────────────────────────────────────────────────

export async function seedIndexaDataAction(): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { error } = await supabase.rpc('seed_indexa_for_user', { p_user_id: user.id });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/patrimonio');
  return { ok: true };
}
