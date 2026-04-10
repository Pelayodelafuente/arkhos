import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchPrices } from '@/lib/patrimonio/price-service';
import type { PriceFetchRequest, PriceResult } from '@/lib/patrimonio/price-service';

interface RequestBody {
  assets: PriceFetchRequest[];
}

interface RouteResponse {
  prices: Record<string, PriceResult>;
  errors: string[];
  cached: boolean;
}

// TTL in seconds per asset category
function getTtl(category: string): number {
  if (category === 'crypto') return 30;
  return 60;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Auth guard
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse + validate body
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { prices: {}, errors: ['Invalid JSON body'], cached: false } satisfies RouteResponse,
    );
  }

  if (!Array.isArray(body?.assets)) {
    return NextResponse.json(
      { prices: {}, errors: ['assets must be an array'], cached: false } satisfies RouteResponse,
    );
  }

  const assets = body.assets;
  const errors: string[] = [];

  // 3. Redis cache (optional — graceful if not configured)
  const hasRedis =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

  if (hasRedis) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });

      // Try to serve all from cache
      const cached: Record<string, PriceResult> = {};
      const misses: PriceFetchRequest[] = [];

      for (const asset of assets) {
        const hit = await redis.get<PriceResult>(`prices:${asset.id}`);
        if (hit) {
          cached[asset.id] = { ...hit, source: 'cache' };
        } else {
          misses.push(asset);
        }
      }

      // Full cache hit
      if (misses.length === 0 && Object.keys(cached).length > 0) {
        return NextResponse.json({
          prices: cached,
          errors: [],
          cached: true,
        } satisfies RouteResponse);
      }

      // Fetch only the misses
      const fresh = await fetchPrices(misses);

      // Store fresh results in Redis
      for (const [assetId, result] of Object.entries(fresh)) {
        const asset = assets.find((a) => a.id === assetId);
        const ttl = asset ? getTtl(asset.category) : 60;
        try {
          await redis.setex(`prices:${assetId}`, ttl, result);
        } catch {
          // Cache write failure is non-fatal
        }
      }

      const prices: Record<string, PriceResult> = { ...cached, ...fresh };
      return NextResponse.json({
        prices,
        errors,
        cached: false,
      } satisfies RouteResponse);
    } catch (err) {
      // Redis failure — fall through to direct fetch
      errors.push(`Cache unavailable: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  // 4. Direct fetch (no Redis, or Redis failed)
  try {
    const prices = await fetchPrices(assets);
    return NextResponse.json({
      prices,
      errors,
      cached: false,
    } satisfies RouteResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching prices';
    return NextResponse.json({
      prices: {},
      errors: [message],
      cached: false,
    } satisfies RouteResponse);
  }
}
