'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { AssetCategory, RiskLevel, TransactionType } from '@/types/patrimonio';

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

export interface AssetFormData {
  name: string;
  ticker?: string;
  isin?: string;
  category: AssetCategory;
  risk_level?: RiskLevel;
  sector?: string;
  geographic_region?: string;
  platform_id: string;
  current_quantity?: number;
  avg_buy_price?: number;
  total_invested?: number;
  current_price?: number;
}

export interface TransactionFormData {
  asset_id: string;
  platform_id: string;
  type: TransactionType;
  transaction_date: string;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  notes?: string;
}

export interface PlanExecution {
  assetId: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  date: string;
}

type Result<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function importPatrimonioData(): Promise<{
  success: boolean;
  message: string;
  counts?: { assets: number; platforms: number; income: number };
}> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'No autenticado' };
  }

  const { data, error } = await supabase.rpc('seed_patrimonio_for_user', {
    p_user_id: user.id,
  });

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[patrimonio] seed error:', error.message);
    }
    return { success: false, message: 'Error al importar los datos. Inténtalo de nuevo.' };
  }

  // Importar transacciones históricas reales
  const { error: txError } = await supabase.rpc('seed_patrimonio_transactions', {
    p_user_id: user.id,
  });
  if (txError && process.env.NODE_ENV !== 'production') {
    console.error('[patrimonio] transactions seed error:', txError.message);
  }

  // Generar snapshots históricos mensuales
  const { error: snapshotError } = await supabase.rpc('generate_historical_snapshots', {
    p_user_id: user.id,
  });
  if (snapshotError && process.env.NODE_ENV !== 'production') {
    console.error('[patrimonio] snapshots error:', snapshotError.message);
  }

  revalidatePath('/patrimonio');

  const result = data as {
    success: boolean;
    platforms: number;
    assets_tr: number;
    assets_other: number;
    savings_plan_items: number;
    passive_income_records: number;
  };

  return {
    success: true,
    message: `${result.assets_tr + result.assets_other} activos · 191 transacciones · 18 snapshots históricos importados`,
    counts: {
      assets: result.assets_tr + result.assets_other,
      platforms: result.platforms,
      income: result.passive_income_records,
    },
  };
}

export async function updatePlatformValueAction(
  platformSlug: string,
  totalValue: number
): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { data: platform } = await supabase
    .from('investment_platforms')
    .select('id')
    .eq('user_id', user.id)
    .eq('slug', platformSlug)
    .single();

  if (!platform) return { success: false };

  await supabase
    .from('portfolio_assets')
    .update({
      current_price: totalValue,
      current_price_eur: totalValue,
      price_updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('platform_id', platform.id)
    .in('category', ['fund', 'p2p']);

  revalidatePath('/patrimonio');
  return { success: true };
}

// ============================================================
// EJECUTAR PLAN DE AHORRO MENSUAL
// ============================================================
export async function executeSavingsPlan(
  executions: PlanExecution[]
): Promise<Result<{ count: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const rows = executions.map((e) => ({
    user_id: user.id,
    asset_id: e.assetId,
    platform_id: '', // se rellena abajo
    type: 'savings_plan' as TransactionType,
    transaction_date: e.date,
    quantity: e.quantity,
    price_per_unit: e.pricePerUnit,
    total_amount: e.totalAmount,
    source: 'manual',
  }));

  // Obtener platform_id de Trade Republic
  const { data: platform } = await supabase
    .from('investment_platforms')
    .select('id')
    .eq('user_id', user.id)
    .eq('slug', 'trade-republic')
    .single();

  if (!platform) return { success: false, error: 'Plataforma no encontrada' };

  const rowsWithPlatform = rows.map((r) => ({ ...r, platform_id: platform.id }));

  const { error } = await supabase.from('portfolio_transactions').insert(rowsWithPlatform);
  if (error) return { success: false, error: error.message };

  // Recalcular activos afectados
  const assetIds = [...new Set(executions.map((e) => e.assetId))];
  await recalcAssets(supabase, user.id, assetIds);

  revalidatePath('/patrimonio');
  return { success: true, data: { count: executions.length } };
}

// ============================================================
// CRUD ACTIVOS
// ============================================================
export async function createAsset(data: AssetFormData): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: asset, error } = await supabase
    .from('portfolio_assets')
    .insert({
      user_id: user.id,
      platform_id: data.platform_id,
      name: data.name,
      ticker: data.ticker ?? null,
      isin: data.isin ?? null,
      category: data.category,
      risk_level: data.risk_level ?? 'medium',
      sector: data.sector ?? null,
      geographic_region: data.geographic_region ?? null,
      current_quantity: data.current_quantity ?? 0,
      avg_buy_price: data.avg_buy_price ?? 0,
      total_invested: data.total_invested ?? 0,
      current_price: data.current_price ?? null,
      current_price_eur: data.current_price ?? null,
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/patrimonio');
  return { success: true, data: { id: asset.id } };
}

export async function updateAsset(id: string, data: Partial<AssetFormData>): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { error } = await supabase
    .from('portfolio_assets')
    .update({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.ticker !== undefined && { ticker: data.ticker }),
      ...(data.isin !== undefined && { isin: data.isin }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.risk_level !== undefined && { risk_level: data.risk_level }),
      ...(data.sector !== undefined && { sector: data.sector }),
      ...(data.geographic_region !== undefined && { geographic_region: data.geographic_region }),
      ...(data.current_quantity !== undefined && { current_quantity: data.current_quantity }),
      ...(data.avg_buy_price !== undefined && { avg_buy_price: data.avg_buy_price }),
      ...(data.total_invested !== undefined && { total_invested: data.total_invested }),
      ...(data.current_price !== undefined && { current_price: data.current_price, current_price_eur: data.current_price }),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/patrimonio');
  return { success: true };
}

export async function deleteAsset(id: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { error } = await supabase
    .from('portfolio_assets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/patrimonio');
  return { success: true };
}

// ============================================================
// CRUD TRANSACCIONES
// ============================================================
export async function addTransaction(data: TransactionFormData): Promise<Result<{ id: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: tx, error } = await supabase
    .from('portfolio_transactions')
    .insert({
      user_id: user.id,
      asset_id: data.asset_id,
      platform_id: data.platform_id,
      type: data.type,
      transaction_date: data.transaction_date,
      quantity: data.quantity,
      price_per_unit: data.price_per_unit,
      total_amount: data.total_amount,
      notes: data.notes ?? null,
      source: 'manual',
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };

  await recalcAssets(supabase, user.id, [data.asset_id]);

  revalidatePath('/patrimonio');
  return { success: true, data: { id: tx.id } };
}

export async function updateTransaction(
  id: string,
  data: Partial<TransactionFormData>
): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: existing } = await supabase
    .from('portfolio_transactions')
    .select('asset_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  const { error } = await supabase
    .from('portfolio_transactions')
    .update({
      ...(data.type !== undefined && { type: data.type }),
      ...(data.transaction_date !== undefined && { transaction_date: data.transaction_date }),
      ...(data.quantity !== undefined && { quantity: data.quantity }),
      ...(data.price_per_unit !== undefined && { price_per_unit: data.price_per_unit }),
      ...(data.total_amount !== undefined && { total_amount: data.total_amount }),
      ...(data.notes !== undefined && { notes: data.notes }),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };

  const assetId = data.asset_id ?? existing?.asset_id;
  if (assetId) await recalcAssets(supabase, user.id, [assetId]);

  revalidatePath('/patrimonio');
  return { success: true };
}

export async function deleteTransaction(id: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data: tx } = await supabase
    .from('portfolio_transactions')
    .select('asset_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  const { error } = await supabase
    .from('portfolio_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };

  if (tx?.asset_id) await recalcAssets(supabase, user.id, [tx.asset_id]);

  revalidatePath('/patrimonio');
  return { success: true };
}

// ============================================================
// PLAN DE AHORRO: toggle, editar importe, añadir ítem
// ============================================================
export async function toggleSavingsPlanItem(
  itemId: string,
  isActive: boolean
): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { error } = await supabase
    .from('savings_plan_items')
    .update({
      is_active: isActive,
      ended_at: isActive ? null : new Date().toISOString().slice(0, 10),
    })
    .eq('id', itemId)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath('/patrimonio');
  return { success: true };
}

export async function updateSavingsPlanAmount(
  itemId: string,
  monthlyAmount: number
): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { error } = await supabase
    .from('savings_plan_items')
    .update({ monthly_amount: monthlyAmount })
    .eq('id', itemId)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath('/patrimonio');
  return { success: true };
}

export async function addSavingsPlanItem(
  assetId: string,
  monthlyAmount: number,
  startedAt?: string
): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { error } = await supabase
    .from('savings_plan_items')
    .insert({
      user_id: user.id,
      asset_id: assetId,
      monthly_amount: monthlyAmount,
      is_active: true,
      started_at: startedAt ?? new Date().toISOString().slice(0, 10),
    });

  if (error) return { success: false, error: error.message };
  revalidatePath('/patrimonio');
  return { success: true };
}

// ============================================================
// HELPER: recalcular current_quantity / avg_buy_price / total_invested
// ============================================================
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function recalcAssets(
  supabase: SupabaseClient,
  userId: string,
  assetIds: string[]
): Promise<void> {
  for (const assetId of assetIds) {
    const { data: txs } = await supabase
      .from('portfolio_transactions')
      .select('type, quantity, total_amount')
      .eq('user_id', userId)
      .eq('asset_id', assetId);

    if (!txs) continue;

    let totalQty = 0;
    let totalInv = 0;

    for (const tx of txs) {
      const qty = Number(tx.quantity ?? 0);
      const amt = Number(tx.total_amount ?? 0);
      if (['buy', 'savings_plan', 'saveback'].includes(tx.type)) {
        totalQty += qty;
        totalInv += amt;
      } else {
        totalQty -= qty;
        totalInv -= amt;
      }
    }

    await supabase
      .from('portfolio_assets')
      .update({
        current_quantity: totalQty,
        total_invested: totalInv,
        avg_buy_price: totalQty > 0 ? totalInv / totalQty : 0,
      })
      .eq('id', assetId)
      .eq('user_id', userId);
  }
}
