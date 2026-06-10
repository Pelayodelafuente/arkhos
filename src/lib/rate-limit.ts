import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

// ── Rate limiting con Upstash (sliding window atómico) ──────────────────────
// Sin Redis configurado o ante error de red, degrada a un limitador en memoria
// (por proceso) en lugar de fail-open silencioso. Los fallos se loggean.

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Un limiter por combinación limit/window (Ratelimit fija la ventana al crearse)
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, window: number): Ratelimit | null {
  if (!redis) return null;
  const key = `${limit}:${window}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${window} s`),
      prefix: 'arkhos:rl',
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

// ── Fallback en memoria (sliding window aproximado por proceso) ─────────────

const memoryHits = new Map<string, number[]>();

function memoryLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const hits = (memoryHits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  memoryHits.set(key, hits);
  // Poda periódica para que el Map no crezca sin límite
  if (memoryHits.size > 1000) {
    for (const [k, v] of memoryHits) {
      if (v.every((t) => now - t >= windowMs)) memoryHits.delete(k);
    }
  }
  return { success: hits.length <= limit, remaining: Math.max(0, limit - hits.length) };
}

// ── API pública (misma firma que siempre) ────────────────────────────────────

export async function rateLimit(
  req: NextRequest,
  { limit = 10, window = 60 }: { limit?: number; window?: number } = {}
): Promise<{ success: boolean; remaining: number }> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';
  const key = `${req.nextUrl.pathname}:${ip}`;

  const limiter = getLimiter(limit, window);
  if (limiter) {
    try {
      const { success, remaining } = await limiter.limit(key);
      return { success, remaining };
    } catch (err) {
      console.error('[rate-limit] Redis no disponible, usando fallback en memoria:', err);
    }
  }
  return memoryLimit(key, limit, window);
}
