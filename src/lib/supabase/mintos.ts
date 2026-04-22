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
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data as MintosOverview | null;
}

export async function getMintosDeposits(userId: string): Promise<MintosDeposit[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('mintos_deposits')
    .select('*')
    .eq('user_id', userId)
    .order('deposit_date', { ascending: true });
  return (data as MintosDeposit[]) ?? [];
}

export async function getMintosMonthlySnapshots(userId: string): Promise<MintosMonthlySnapshot[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('mintos_monthly_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('year', { ascending: true })
    .order('month', { ascending: true });
  return (data as MintosMonthlySnapshot[]) ?? [];
}

export async function getMintosPortfolioHealth(userId: string): Promise<MintosPortfolioHealth | null> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('mintos_portfolio_health')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data as MintosPortfolioHealth | null;
}

export async function getMintosDistributions(userId: string): Promise<MintosDistribution[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('mintos_distributions')
    .select('*')
    .eq('user_id', userId)
    .order('dimension', { ascending: true })
    .order('display_order', { ascending: true });
  return (data as MintosDistribution[]) ?? [];
}

export async function getMintosPlan(userId: string): Promise<MintosPlan | null> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('mintos_plan')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data as MintosPlan | null;
}
