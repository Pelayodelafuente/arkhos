'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type {
  CryptoAsset,
  CryptoTransaction,
  CryptoDefiPosition,
  CryptoMonthlyPlan,
} from '@/types/crypto';
import {
  getCryptoAssets,
  getCryptoTransactions,
  getCryptoDefiPositions,
  getCryptoMonthlyPlan,
  addCryptoTransaction,
} from '@/lib/supabase/crypto';

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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CryptoFullData {
  assets: CryptoAsset[];
  transactions: CryptoTransaction[];
  defiPositions: CryptoDefiPosition[];
  monthlyPlan: CryptoMonthlyPlan[];
}

// ── Full data load ────────────────────────────────────────────────────────────

export async function loadCryptoData(): Promise<CryptoFullData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [assets, transactions, defiPositions, monthlyPlan] = await Promise.all([
    getCryptoAssets(user.id),
    getCryptoTransactions(user.id),
    getCryptoDefiPositions(user.id),
    getCryptoMonthlyPlan(user.id),
  ]);

  return { assets, transactions, defiPositions, monthlyPlan };
}

// ── Add transaction ───────────────────────────────────────────────────────────

export interface AddCryptoTransactionResult {
  ok: boolean;
  transaction?: CryptoTransaction;
  // Activo recalculado (total_invested_eur/avg_buy_price_eur) tras la transacción —
  // permite al call-site actualizar el store sin un refetch completo.
  asset?: CryptoAsset;
  error?: string;
}

export async function addCryptoTransactionAction(
  tx: Omit<CryptoTransaction, 'id' | 'user_id' | 'created_at'>
): Promise<AddCryptoTransactionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'No autenticado' };

  const transaction = await addCryptoTransaction(user.id, tx);
  if (!transaction) return { ok: false, error: 'Error al insertar la transacción' };

  let asset: CryptoAsset | undefined;
  if (tx.asset_id) {
    const assets = await getCryptoAssets(user.id);
    asset = assets.find((a) => a.id === tx.asset_id);
  }

  revalidatePath('/patrimonio');
  return { ok: true, transaction, asset };
}
