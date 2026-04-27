import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type {
  MintosOverview,
  MintosDeposit,
  MintosMonthlySnapshot,
  MintosPortfolioHealth,
  MintosDistribution,
  MintosPlan,
} from '@/types/mintos';

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

export async function getMintosOverview(userId: string): Promise<MintosOverview | null> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('mintos_overview')
    .select('id, user_id, total_value, invested_in_loans, cash_balance, pending_payments, net_gain, xirr, avg_interest_rate, active_loans_count, originators_count, countries_count, snapshot_date, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  return data as MintosOverview | null;
}

export async function getMintosDeposits(userId: string): Promise<MintosDeposit[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('mintos_deposits')
    .select('id, user_id, deposit_date, amount, notes, created_at')
    .eq('user_id', userId)
    .order('deposit_date', { ascending: true });
  return (data as MintosDeposit[]) ?? [];
}

export async function getMintosMonthlySnapshots(userId: string): Promise<MintosMonthlySnapshot[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('mintos_monthly_snapshots')
    .select('id, user_id, year, month, total_value, total_deposited, deposits, interest_income, capital_received, buyback_principal, buyback_interest, investments, secondary_market, late_interest, created_at, updated_at')
    .eq('user_id', userId)
    .order('year', { ascending: true })
    .order('month', { ascending: true });
  return (data as MintosMonthlySnapshot[]) ?? [];
}

export async function getMintosPortfolioHealth(userId: string): Promise<MintosPortfolioHealth | null> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('mintos_portfolio_health')
    .select('id, user_id, on_track_amount, grace_period_amount, late_1_15_amount, late_16_30_amount, late_31_60_amount, default_amount, on_track_count, grace_period_count, late_1_15_count, late_16_30_count, late_31_60_count, default_count, snapshot_date, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  return data as MintosPortfolioHealth | null;
}

export async function getMintosDistributions(userId: string): Promise<MintosDistribution[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('mintos_distributions')
    .select('id, user_id, dimension, category, amount, percentage, loan_count, display_order, updated_at')
    .eq('user_id', userId)
    .order('dimension', { ascending: true })
    .order('display_order', { ascending: true });
  return (data as MintosDistribution[]) ?? [];
}

export async function getMintosPlan(userId: string): Promise<MintosPlan | null> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('mintos_plan')
    .select('id, user_id, monthly_amount, execution_day, is_active, next_date, notes, started_at')
    .eq('user_id', userId)
    .maybeSingle();
  return data as MintosPlan | null;
}
