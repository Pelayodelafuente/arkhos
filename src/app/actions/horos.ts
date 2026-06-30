'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type {
  HorosPosition,
  HorosTransaction,
  HorosNavHistory,
  HorosFundDistribution,
  HorosAnnualCosts,
  HorosMonthlyPlan,
} from '@/types/horos';

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

// ── Types ────────────────────────────────────────────────────────────────────

export interface HorosFullData {
  position: HorosPosition | null;
  transactions: HorosTransaction[];
  navHistory: HorosNavHistory[];
  distribution: HorosFundDistribution[];
  costs: HorosAnnualCosts[];
  plan: HorosMonthlyPlan | null;
}

// ── Full data load ───────────────────────────────────────────────────────────

async function fetchHorosFullData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<HorosFullData> {
  const [posRes, txRes, navRes, distRes, costsRes, planRes] = await Promise.all([
    supabase
      .from('horos_position')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('horos_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('value_date', { ascending: true }),
    supabase
      .from('horos_nav_history')
      .select('*')
      .eq('user_id', userId)
      .order('nav_date', { ascending: true }),
    supabase
      .from('horos_fund_distribution')
      .select('*')
      .eq('user_id', userId)
      .order('report_date', { ascending: false }),
    supabase
      .from('horos_annual_costs')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false }),
    supabase
      .from('horos_monthly_plan')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  return {
    position: posRes.data as HorosPosition | null,
    transactions: (txRes.data ?? []) as HorosTransaction[],
    navHistory: (navRes.data ?? []) as HorosNavHistory[],
    distribution: (distRes.data ?? []) as HorosFundDistribution[],
    costs: (costsRes.data ?? []) as HorosAnnualCosts[],
    plan: planRes.data as HorosMonthlyPlan | null,
  };
}

export async function loadHorosData(): Promise<HorosFullData | null> {
  const { supabase, user } = await getAuthUser();
  if (!user) return null;

  return fetchHorosFullData(supabase, user.id);
}

// ── Update NAV ───────────────────────────────────────────────────────────────

export interface UpdateNAVInput {
  navPrice: number;
  navDate: string;
}

export async function updateHorosNAV(
  input: UpdateNAVInput
): Promise<{ ok: boolean; error?: string; data?: HorosFullData }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const pos = await supabase
    .from('horos_position')
    .select('shares, total_cost')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!pos.data) return { ok: false, error: 'No hay posición registrada' };

  const { shares } = pos.data as { shares: number; total_cost: number };
  const newTotalValue = parseFloat((shares * input.navPrice).toFixed(2));

  const { error } = await supabase
    .from('horos_position')
    .update({
      nav_price: input.navPrice,
      nav_date: input.navDate,
      total_value: newTotalValue,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) return { ok: false, error: error.message };

  // Insert in NAV history
  await supabase.from('horos_nav_history').upsert(
    {
      user_id: user.id,
      nav_date: input.navDate,
      nav_price: input.navPrice,
      portfolio_value: newTotalValue,
    },
    { onConflict: 'user_id,nav_date' }
  );

  const data = await fetchHorosFullData(supabase, user.id);

  revalidatePath('/patrimonio');
  return { ok: true, data };
}

// ── Register contribution ────────────────────────────────────────────────────

export interface RegisterHorosContributionInput {
  requestDate: string;
  valueDate: string;
  navApplied: number;
  amount: number;
  notes?: string;
}

export async function registerHorosContribution(
  input: RegisterHorosContributionInput
): Promise<{ ok: boolean; error?: string; data?: HorosFullData }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const sharesObtained = parseFloat((input.amount / input.navApplied).toFixed(6));

  const { error: txError } = await supabase.from('horos_transactions').insert({
    user_id: user.id,
    request_date: input.requestDate,
    value_date: input.valueDate,
    type: 'subscription',
    nav_applied: input.navApplied,
    shares: sharesObtained,
    amount: input.amount,
    notes: input.notes ?? null,
    source: 'manual',
  });

  if (txError) return { ok: false, error: txError.message };

  // Update position: add shares and cost
  const posRes = await supabase
    .from('horos_position')
    .select('shares, total_cost, total_value, nav_price')
    .eq('user_id', user.id)
    .maybeSingle();

  if (posRes.data) {
    const current = posRes.data as {
      shares: number;
      total_cost: number;
      total_value: number;
      nav_price: number;
    };
    const newShares = current.shares + sharesObtained;
    const newCost = current.total_cost + input.amount;
    const newValue = parseFloat((newShares * current.nav_price).toFixed(2));

    await supabase
      .from('horos_position')
      .update({
        shares: newShares,
        total_cost: newCost,
        total_value: newValue,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Also record a nav_history point on the value date so the portfolio chart updates
    const portfolioValueOnValueDate = parseFloat((newShares * input.navApplied).toFixed(2));
    await supabase.from('horos_nav_history').upsert(
      {
        user_id: user.id,
        nav_date: input.valueDate,
        nav_price: input.navApplied,
        portfolio_value: portfolioValueOnValueDate,
      },
      { onConflict: 'user_id,nav_date' }
    );
  }

  const data = await fetchHorosFullData(supabase, user.id);

  revalidatePath('/patrimonio');
  return { ok: true, data };
}

// ── Seed ─────────────────────────────────────────────────────────────────────

export async function seedHorosDataAction(): Promise<{ ok: boolean; error?: string; data?: HorosFullData }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { error } = await supabase.rpc('seed_horos_for_user', { p_user_id: user.id });
  if (error) return { ok: false, error: error.message };

  const data = await fetchHorosFullData(supabase, user.id);

  revalidatePath('/patrimonio');
  return { ok: true, data };
}
