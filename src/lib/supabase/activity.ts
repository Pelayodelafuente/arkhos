import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

type Client = SupabaseClient<Database>;

export interface ActivityEntry {
  id: string;
  user_id: string;
  module: string;
  action: string;
  entity_name: string | null;
  detail: string | null;
  created_at: string;
}

export async function logActivity(
  client: Client,
  userId: string,
  module: string,
  action: string,
  entityName?: string,
  detail?: string
): Promise<void> {
  await client.from('activity_log').insert({
    user_id: userId,
    module,
    action,
    entity_name: entityName ?? null,
    detail: detail ?? null,
  });
}

export async function getRecentActivity(
  client: Client,
  userId: string,
  limit = 20,
  module?: string
): Promise<ActivityEntry[]> {
  let query = client
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (module) {
    query = query.eq('module', module);
  }

  const result = await query;
  return (result.data ?? []) as ActivityEntry[];
}

export async function getProjectActivity(
  client: Client,
  userId: string,
  projectId: string,
  limit = 30,
  offset = 0
): Promise<{ entries: ActivityEntry[]; hasMore: boolean }> {
  const result = await client
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .eq('module', 'proyectos')
    .ilike('detail', `%${projectId}%`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit);

  const entries = (result.data ?? []) as ActivityEntry[];
  const hasMore = entries.length > limit;
  return { entries: entries.slice(0, limit), hasMore };
}
