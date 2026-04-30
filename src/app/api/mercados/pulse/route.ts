import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchPulseData } from '@/lib/mercados/pulse';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const { success } = await rateLimit(req, { limit: 20, window: 60 });
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const forceRefresh = req.nextUrl.searchParams.get('refresh') === 'true';

  try {
    const data = await fetchPulseData(forceRefresh);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[mercados/pulse] Error:', error);
    return NextResponse.json({ error: 'Error fetching market data' }, { status: 500 });
  }
}
