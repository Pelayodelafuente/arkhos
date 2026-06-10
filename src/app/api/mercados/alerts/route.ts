import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { createClient } from '@/lib/supabase/server';
import { getUserAlerts, markAlertRead, markAllAlertsRead, createRebalanceAlerts } from '@/lib/mercados/alerts';
import { rateLimit } from '@/lib/rate-limit';

const postSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('mark_all_read') }),
  z.object({ action: z.literal('mark_read'), alertId: z.uuid() }),
  z.object({
    action: z.literal('create_rebalance'),
    alerts: z
      .array(
        z.object({
          assetClass: z.string().max(60),
          currentPct: z.number(),
          targetPct: z.number(),
          deviation: z.number(),
          action: z.enum(['reduce', 'increase']),
          message: z.string().max(1000),
          severity: z.enum(['info', 'warning', 'critical']),
        })
      )
      .max(20),
  }),
]);

export async function GET(req: NextRequest) {
  const { success } = await rateLimit(req, { limit: 20, window: 60 });
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const alerts = await getUserAlerts(user.id);
    const unreadCount = alerts.filter(a => !a.is_read).length;
    return NextResponse.json({ alerts, unreadCount }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[mercados/alerts] GET Error:', error);
    return NextResponse.json({ error: 'Error fetching alerts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { success } = await rateLimit(req, { limit: 20, window: 60 });
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  const parsed = postSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  const body = parsed.data;

  try {
    if (body.action === 'mark_all_read') {
      await markAllAlertsRead(user.id);
    } else if (body.action === 'mark_read') {
      await markAlertRead(body.alertId, user.id);
    } else if (body.action === 'create_rebalance') {
      // Antes esta acción se ignoraba silenciosamente — las alertas de
      // rebalanceo que enviaba MercadosView nunca se persistían
      await createRebalanceAlerts(user.id, body.alerts);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mercados/alerts] POST Error:', error);
    return NextResponse.json({ error: 'Error updating alerts' }, { status: 500 });
  }
}
