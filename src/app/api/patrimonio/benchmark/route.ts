import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod/v4';

// ---------------------------------------------------------------------------
// GET /api/patrimonio/benchmark?index=sp500|world
// Cierres mensuales en EUR de un índice de referencia (ETFs UCITS en Xetra)
// para el comparador "¿le gano al mercado?" del GlobalEvolutionChart.
// ---------------------------------------------------------------------------

const BENCHMARKS = {
  sp500: { ticker: 'SXR8.DE', label: 'S&P 500' },
  world: { ticker: 'EUNL.DE', label: 'MSCI World' },
} as const;

const querySchema = z.object({
  index: z.enum(['sp500', 'world']),
});

interface YahooChartResponse {
  chart: {
    result?: Array<{
      timestamp: number[];
      indicators: {
        adjclose?: Array<{ adjclose: (number | null)[] }>;
        quote?: Array<{ close: (number | null)[] }>;
      };
    }>;
    error?: { description: string };
  };
}

// Inicio del histórico de patrimonio (noviembre 2024)
const PERIOD1 = Math.floor(new Date('2024-11-01').getTime() / 1000);

export async function GET(req: NextRequest): Promise<Response> {
  const { success } = await rateLimit(req, { limit: 30, window: 3600 });
  if (!success) {
    return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const parsed = querySchema.safeParse({
    index: req.nextUrl.searchParams.get('index'),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Índice inválido' }, { status: 400 });
  }

  const benchmark = BENCHMARKS[parsed.data.index];

  try {
    const period2 = Math.floor(Date.now() / 1000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      benchmark.ticker
    )}?period1=${PERIOD1}&period2=${period2}&interval=1mo`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Arkhos/1.0)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 21600 }, // cache 6h: los cierres mensuales apenas cambian
    });
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);

    const data = (await res.json()) as YahooChartResponse;
    if (data.chart.error) throw new Error(data.chart.error.description);
    const result = data.chart.result?.[0];
    if (!result) throw new Error('Sin datos del índice');

    const closes =
      result.indicators.adjclose?.[0]?.adjclose ?? result.indicators.quote?.[0]?.close ?? [];

    // 'YYYY-MM' → cierre EUR del mes (la última vela del mes en curso gana)
    const byMonth = new Map<string, number>();
    result.timestamp.forEach((ts, i) => {
      const close = closes[i];
      if (close == null || close <= 0) return;
      byMonth.set(new Date(ts * 1000).toISOString().slice(0, 7), close);
    });

    return NextResponse.json(
      {
        index: parsed.data.index,
        label: benchmark.label,
        prices: [...byMonth.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, close]) => ({ month, close })),
      },
      { headers: { 'Cache-Control': 'private, max-age=3600' } }
    );
  } catch (e) {
    const message =
      process.env.NODE_ENV === 'development' ? String(e) : 'Error al obtener el índice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
