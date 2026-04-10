import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { PricesResponse, PriceUpdate } from '@/types/patrimonio';

// Graceful offline: returns {} if APIs not configured
export async function POST(request: NextRequest) {
  // Auth guard
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
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // If no Redis or API keys configured, return empty (offline mode)
  const hasRedis =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  const hasAlphaVantage = !!process.env.ALPHA_VANTAGE_API_KEY;

  if (!hasRedis && !hasAlphaVantage) {
    const response: PricesResponse = { prices: {} };
    return NextResponse.json(response);
  }

  let body: { assetIds?: string[]; tickers?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { tickers = [] } = body;
  const prices: Record<string, PriceUpdate> = {};

  // If Redis available, check cache first
  if (hasRedis) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });

      const cacheMisses: string[] = [];
      for (const ticker of tickers) {
        const cached = await redis.get<PriceUpdate>(`price:${ticker}`);
        if (cached) {
          prices[ticker] = cached;
        } else {
          cacheMisses.push(ticker);
        }
      }

      // Fetch misses from APIs
      if (cacheMisses.length > 0 && hasAlphaVantage) {
        for (const ticker of cacheMisses) {
          const fetched = await fetchPriceFromAPI(ticker);
          if (fetched) {
            prices[ticker] = fetched;
            const ttl = ticker.includes('.') ? 30 : 60; // crypto 30s, others 60s
            await redis.setex(`price:${ticker}`, ttl, fetched);
          }
        }
      }
    } catch {
      // Redis error — continue without cache
    }
  } else if (hasAlphaVantage) {
    // No cache, fetch directly (limited)
    for (const ticker of tickers.slice(0, 5)) {
      const fetched = await fetchPriceFromAPI(ticker);
      if (fetched) prices[ticker] = fetched;
    }
  }

  return NextResponse.json({ prices } satisfies PricesResponse);
}

async function fetchPriceFromAPI(ticker: string): Promise<PriceUpdate | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;

    const data = await res.json() as {
      'Global Quote'?: { '05. price'?: string; '09. change'?: string };
    };
    const quote = data['Global Quote'];
    if (!quote || !quote['05. price']) return null;

    const price = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change'] ?? '0');

    return {
      price,
      change24h: price > 0 ? (change / (price - change)) * 100 : 0,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
