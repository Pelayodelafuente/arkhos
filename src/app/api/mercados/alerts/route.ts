import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserAlerts, markAlertRead, markAllAlertsRead } from '@/lib/mercados/alerts';
import { rateLimit } from '@/lib/rate-limit';

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

  try {
    const body = (await req.json()) as { action: string; alertId?: string };
    if (body.action === 'mark_all_read') {
      await markAllAlertsRead(user.id);
    } else if (body.action === 'mark_read' && body.alertId) {
      await markAlertRead(body.alertId);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mercados/alerts] POST Error:', error);
    return NextResponse.json({ error: 'Error updating alerts' }, { status: 500 });
  }
}
