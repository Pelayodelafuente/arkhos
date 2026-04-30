import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchPortfolioMarketData } from '@/lib/mercados/portfolio-market';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const { success } = await rateLimit(req, { limit: 10, window: 60 });
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const forceRefresh = req.nextUrl.searchParams.get('refresh') === 'true';
  try {
    const data = await fetchPortfolioMarketData(user.id, forceRefresh);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[mercados/portfolio] Error:', error);
    return NextResponse.json({ error: 'Error fetching portfolio data' }, { status: 500 });
  }
}
