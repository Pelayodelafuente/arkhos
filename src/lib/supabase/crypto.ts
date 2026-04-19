import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type {
  CryptoAsset,
  CryptoTransaction,
  CryptoDefiPosition,
  CryptoMonthlyPlan,
} from '@/types/crypto';

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

export async function getCryptoAssets(userId: string): Promise<CryptoAsset[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('crypto_assets')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('sort_order');
  return (data ?? []) as unknown as CryptoAsset[];
}

export async function getCryptoTransactions(userId: string): Promise<CryptoTransaction[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('crypto_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: true });
  return (data ?? []) as unknown as CryptoTransaction[];
}

export async function getCryptoDefiPositions(userId: string): Promise<CryptoDefiPosition[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('crypto_defi_positions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);
  return (data ?? []) as unknown as CryptoDefiPosition[];
}

export async function getCryptoMonthlyPlan(userId: string): Promise<CryptoMonthlyPlan[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('crypto_monthly_plan')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);
  return (data ?? []) as unknown as CryptoMonthlyPlan[];
}

export async function addCryptoTransaction(
  userId: string,
  tx: Omit<CryptoTransaction, 'id' | 'user_id' | 'created_at'>
): Promise<CryptoTransaction | null> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('crypto_transactions')
    .insert({ ...tx, user_id: userId })
    .select('*')
    .maybeSingle();
  return data as unknown as CryptoTransaction | null;
}

export async function updateCryptoAssetBalance(
  userId: string,
  symbol: string,
  balance: number
): Promise<void> {
  const supabase = await getClient();
  await supabase
    .from('crypto_assets')
    .update({ current_balance: balance })
    .eq('user_id', userId)
    .eq('symbol', symbol);
}
