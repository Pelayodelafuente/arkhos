'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

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
    message: `${result.assets_tr + result.assets_other} activos importados · ${result.savings_plan_items} activos en plan · ${result.platforms} plataformas configuradas`,
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
