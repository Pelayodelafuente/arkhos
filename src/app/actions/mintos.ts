'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type {
  MintosOverview,
  MintosDeposit,
  MintosMonthlySnapshot,
  MintosPortfolioHealth,
  MintosDistribution,
  MintosPlan,
  MintosFullData,
} from '@/types/mintos';

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ── Full data load ────────────────────────────────────────────────────────────

export async function loadMintosData(): Promise<MintosFullData | null> {
  const { supabase, user } = await getAuthUser();
  if (!user) return null;

  const [overviewRes, depositsRes, snapshotsRes, healthRes, distRes, planRes] = await Promise.all([
    supabase.from('mintos_overview').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('mintos_deposits').select('*').eq('user_id', user.id).order('deposit_date', { ascending: true }),
    supabase.from('mintos_monthly_snapshots').select('*').eq('user_id', user.id).order('year').order('month'),
    supabase.from('mintos_portfolio_health').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('mintos_distributions').select('*').eq('user_id', user.id).order('dimension').order('display_order'),
    supabase.from('mintos_plan').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  return {
    overview: (overviewRes.data as MintosOverview | null) ?? null,
    deposits: (depositsRes.data as MintosDeposit[]) ?? [],
    monthlySnapshots: (snapshotsRes.data as MintosMonthlySnapshot[]) ?? [],
    portfolioHealth: (healthRes.data as MintosPortfolioHealth | null) ?? null,
    distributions: (distRes.data as MintosDistribution[]) ?? [],
    plan: (planRes.data as MintosPlan | null) ?? null,
  };
}

// ── Update overview (manual snapshot) ────────────────────────────────────────

export async function updateMintosOverview(data: {
  total_value: number;
  invested_in_loans?: number;
  cash_balance?: number;
  pending_payments?: number;
  net_gain?: number;
  xirr?: number | null;
  avg_interest_rate?: number | null;
  active_loans_count?: number;
  snapshot_date?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { error } = await supabase
    .from('mintos_overview')
    .upsert({
      user_id: user.id,
      ...data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) return { success: false, error: error.message };

  revalidatePath('/patrimonio');
  return { success: true };
}

// ── Update portfolio health ───────────────────────────────────────────────────

export async function updateMintosPortfolioHealth(data: {
  on_track_amount: number;
  grace_period_amount: number;
  late_1_15_amount: number;
  late_16_30_amount: number;
  late_31_60_amount: number;
  default_amount: number;
  on_track_count?: number;
  grace_period_count?: number;
  late_1_15_count?: number;
  late_16_30_count?: number;
  late_31_60_count?: number;
  default_count?: number;
  snapshot_date?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { error } = await supabase
    .from('mintos_portfolio_health')
    .upsert({
      user_id: user.id,
      ...data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) return { success: false, error: error.message };

  revalidatePath('/patrimonio');
  return { success: true };
}

// ── Add deposit ───────────────────────────────────────────────────────────────

export async function addMintosDeposit(data: {
  deposit_date: string;
  amount: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { error } = await supabase
    .from('mintos_deposits')
    .insert({ user_id: user.id, ...data });

  if (error) return { success: false, error: error.message };

  revalidatePath('/patrimonio');
  return { success: true };
}

// ── Upsert monthly snapshots (called after Excel import) ──────────────────────

export async function upsertMintosMonthlySnapshots(
  snapshots: Omit<MintosMonthlySnapshot, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const rows = snapshots.map((s) => ({
    user_id: user.id,
    ...s,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('mintos_monthly_snapshots')
    .upsert(rows, { onConflict: 'user_id,year,month' });

  if (error) return { success: false, error: error.message };

  revalidatePath('/patrimonio');
  return { success: true };
}

// ── Upsert deposits (called after Excel import) ───────────────────────────────

export async function upsertMintosDeposits(
  deposits: Array<{ deposit_date: string; amount: number; notes?: string }>
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { success: false, error: 'No autenticado' };

  // Check for existing deposits by date to avoid duplicates
  const { data: existing } = await supabase
    .from('mintos_deposits')
    .select('deposit_date, amount')
    .eq('user_id', user.id);

  const existingKeys = new Set(
    (existing ?? []).map((d: { deposit_date: string; amount: number }) => `${d.deposit_date}_${d.amount}`)
  );

  const newDeposits = deposits.filter(
    (d) => !existingKeys.has(`${d.deposit_date}_${d.amount}`)
  );

  if (newDeposits.length === 0) return { success: true };

  const { error } = await supabase
    .from('mintos_deposits')
    .insert(newDeposits.map((d) => ({ user_id: user.id, ...d })));

  if (error) return { success: false, error: error.message };

  revalidatePath('/patrimonio');
  return { success: true };
}
