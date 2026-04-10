import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  fetchAllTRPrices,
  isEUMarketOpen,
  isUSMarketOpen,
  isHKMarketOpen,
} from '@/lib/patrimonio/price-service';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'),
});

export async function POST(): Promise<Response> {
  // 1. Auth guard
  let userId: string;
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
    userId = user.id;
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Rate limit by userId
  const { success, reset } = await ratelimit.limit(userId);
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return Response.json(
      { error: 'Too many requests', retryAfter },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      },
    );
  }

  // 3. Verify env vars are configured
  const hasAlphaVantage = Boolean(process.env.ALPHA_VANTAGE_API_KEY);
  const hasExchangeRate = Boolean(process.env.EXCHANGE_RATE_API_KEY);
  if (!hasAlphaVantage && !hasExchangeRate) {
    return Response.json({
      prices: [],
      errors: ['APIs no configuradas'],
      offline: true,
      timestamp: new Date().toISOString(),
    });
  }

  // 4. Fetch all prices
  const result = await fetchAllTRPrices(redis);

  // Diagnostic summary log
  const bySource = result.prices.reduce<Record<string, string[]>>((acc, p) => {
    (acc[p.source] ??= []).push(p.isin);
    return acc;
  }, {});
  console.log('[route/prices] Prices by source:', Object.fromEntries(Object.entries(bySource).map(([s, isins]) => [s, isins.length])));
  console.log('[route/prices] Errors:', result.errors);

  // 5. Market status
  const marketStatus = {
    eu: isEUMarketOpen() ? 'open' : 'closed',
    us: isUSMarketOpen() ? 'open' : 'closed',
    hk: isHKMarketOpen() ? 'open' : 'closed',
  };

  // 6. Always return 200
  return Response.json({
    prices: result.prices,
    forex: result.forex,
    errors: result.errors,
    marketStatus,
    timestamp: new Date().toISOString(),
  });
}
