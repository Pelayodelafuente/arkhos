import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  fetchAllTRPrices,
  isEUMarketOpen,
  isUSMarketOpen,
  isHKMarketOpen,
} from '@/lib/patrimonio/price-service';

export async function POST(): Promise<Response> {
  // 1. Auth guard
  try {
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
                cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Verificar env vars mínimas configuradas
  const hasFinnhub = Boolean(process.env.FINNHUB_API_KEY);
  const hasExchangeRate = Boolean(process.env.EXCHANGE_RATE_API_KEY);
  if (!hasFinnhub && !hasExchangeRate) {
    return Response.json({
      prices: [],
      errors: ['APIs no configuradas'],
      offline: true,
      timestamp: new Date().toISOString(),
    });
  }

  // 3. Fetch directo — sin caché, sin rate limiting
  const result = await fetchAllTRPrices();

  // 4. Market status
  const marketStatus = {
    eu: isEUMarketOpen() ? 'open' : 'closed',
    us: isUSMarketOpen() ? 'open' : 'closed',
    hk: isHKMarketOpen() ? 'open' : 'closed',
  };

  return Response.json({
    prices: result.prices,
    forex: result.forex,
    errors: result.errors,
    marketStatus,
    timestamp: new Date().toISOString(),
    debug: result.debug,
  });
}
