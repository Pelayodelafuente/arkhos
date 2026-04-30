import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function rateLimit(
  req: NextRequest,
  { limit = 10, window = 60 }: { limit?: number; window?: number } = {}
): Promise<{ success: boolean; remaining: number }> {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return { success: true, remaining: limit };
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const key = `rate_limit:${req.nextUrl.pathname}:${ip}`;

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }

  return {
    success: current <= limit,
    remaining: Math.max(0, limit - current),
  };
}
