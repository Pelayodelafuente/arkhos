import { Redis } from '@upstash/redis';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/** Scan + delete all keys matching a glob pattern. Returns count deleted. */
async function scanAndDelete(pattern: string): Promise<number> {
  let deleted = 0;
  let cursor = 0;
  do {
    const [next, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
    cursor = typeof next === 'string' ? parseInt(next, 10) : next;
    if (keys.length > 0) {
      await redis.del(...(keys as [string, ...string[]]));
      deleted += keys.length;
    }
  } while (cursor !== 0);
  return deleted;
}

export async function GET(): Promise<Response> {
  // Auth guard — only authenticated users can purge
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Purge all price and forex cache keys
  const [priceDeleted, forexDeleted] = await Promise.all([
    scanAndDelete('price:*'),
    scanAndDelete('forex:*'),
  ]);

  const total = priceDeleted + forexDeleted;
  console.log(`[purge] Deleted ${priceDeleted} price keys + ${forexDeleted} forex keys = ${total} total`);

  return Response.json({
    ok: true,
    deleted: { price: priceDeleted, forex: forexDeleted, total },
    message: `Purgadas ${total} claves de Redis. El próximo "Actualizar precios" obtendrá datos frescos.`,
  });
}
