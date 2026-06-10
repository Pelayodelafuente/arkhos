import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _admin;
}

export interface CachedMetric {
  source: string;
  metric: string;
  value: {
    current: number;
    change24h?: number;
    changePct24h?: number;
    history?: Array<{ date: string; value: number }>;
    label?: string;
    raw?: unknown;
  };
  fetched_at: string;
  ttl_hours: number;
}

export async function getCachedMetric(
  source: string,
  metric: string,
  forceRefresh = false
): Promise<CachedMetric | null> {
  if (forceRefresh) return null;

  const admin = getAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from('market_data_cache')
    .select('*')
    .eq('source', source)
    .eq('metric', metric)
    .single();

  if (error || !data) return null;

  const fetchedAt = new Date(data.fetched_at as string);
  const now = new Date();
  const hoursDiff = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60);

  if (hoursDiff > (data.ttl_hours as number)) return null;

  return data as unknown as CachedMetric;
}

export async function setCachedMetric(
  source: string,
  metric: string,
  value: CachedMetric['value'],
  ttlHours: number
): Promise<void> {
  const admin = getAdmin();
  if (!admin) return;

  await admin
    .from('market_data_cache')
    .upsert(
      { source, metric, value, fetched_at: new Date().toISOString(), ttl_hours: ttlHours },
      { onConflict: 'source,metric' }
    );
}

export async function getAllCachedPulse(): Promise<Record<string, CachedMetric>> {
  const admin = getAdmin();
  if (!admin) return {};

  const { data } = await admin
    .from('market_data_cache')
    .select('*');

  if (!data) return {};

  return (data as unknown[]).reduce<Record<string, CachedMetric>>((acc, row) => {
    const r = row as CachedMetric;
    acc[r.metric] = r;
    return acc;
  }, {});
}

/**
 * Lee varias métricas de la caché y devuelve { metric: valorActual | null }.
 * Único punto de acceso a market_data_cache para consumidores server-side
 * (p. ej. el dashboard) — evita repartir clientes service_role por las páginas.
 */
export async function getCachedMetricValues(
  metrics: string[]
): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {};
  const admin = getAdmin();
  if (!admin) return result;

  const { data, error } = await admin
    .from('market_data_cache')
    .select('metric, value')
    .in('metric', metrics);

  if (error || !data) return result;

  for (const row of data as Array<{ metric: string; value: { current?: number } | null }>) {
    const v = row.value?.current ?? null;
    result[row.metric] = typeof v === 'number' ? v : null;
  }
  return result;
}
