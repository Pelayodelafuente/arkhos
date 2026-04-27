import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type {
  HorosPosition,
  HorosTransaction,
  HorosNavHistory,
  HorosFundDistribution,
  HorosAnnualCosts,
  HorosMonthlyPlan,
} from '@/types/horos';

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

export async function getHorosPosition(userId: string): Promise<HorosPosition | null> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('horos_position')
    .select('id, user_id, fund_name, isin, account_code, shares, nav_price, nav_date, total_value, total_cost, unrealized_gain, unrealized_gain_pct, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  return data as HorosPosition | null;
}

export async function getHorosTransactions(userId: string): Promise<HorosTransaction[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('horos_transactions')
    .select('id, user_id, request_date, value_date, type, nav_applied, shares, amount, commission, notes, source, created_at')
    .eq('user_id', userId)
    .order('value_date', { ascending: true });
  return (data ?? []) as HorosTransaction[];
}

export async function getHorosNavHistory(userId: string): Promise<HorosNavHistory[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('horos_nav_history')
    .select('id, user_id, nav_date, nav_price, portfolio_value, created_at')
    .eq('user_id', userId)
    .order('nav_date', { ascending: true });
  return (data ?? []) as HorosNavHistory[];
}

export async function getHorosFundDistribution(
  userId: string
): Promise<HorosFundDistribution[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('horos_fund_distribution')
    .select('id, user_id, report_date, dimension, category, percentage, created_at')
    .eq('user_id', userId)
    .order('report_date', { ascending: false });
  return (data ?? []) as HorosFundDistribution[];
}

export async function getHorosAnnualCosts(userId: string): Promise<HorosAnnualCosts[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('horos_annual_costs')
    .select('id, user_id, year, management_fee, custody_fee, other_fees, operation_costs, total_costs, total_pct, created_at')
    .eq('user_id', userId)
    .order('year', { ascending: false });
  return (data ?? []) as HorosAnnualCosts[];
}

export async function getHorosMonthlyPlan(userId: string): Promise<HorosMonthlyPlan | null> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('horos_monthly_plan')
    .select('id, user_id, monthly_amount, execution_day, is_active, started_at, notes, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  return data as HorosMonthlyPlan | null;
}

export async function hasHorosData(userId: string): Promise<boolean> {
  const supabase = await getClient();
  const { count } = await supabase
    .from('horos_position')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}

export async function seedHorosData(userId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getClient();
  const { error } = await supabase.rpc('seed_horos_for_user', { p_user_id: userId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
