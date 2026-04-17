import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { TICKER_CONFIG } from '@/lib/patrimonio/price-service';
import type { Database } from '@/lib/supabase/types';

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface YahooChartResult {
  meta: { currency: string };
  timestamp: number[];
  indicators: {
    adjclose?: Array<{ adjclose: (number | null)[] }>;
    quote?: Array<{ close: (number | null)[] }>;
  };
}

interface YahooChartResponse {
  chart: {
    result?: YahooChartResult[];
    error?: { description: string };
  };
}

interface MonthlyPrice {
  date: string;   // YYYY-MM-DD (último día del mes)
  price: number;  // precio en divisa original
}

interface ForexHistory {
  [date: string]: number; // date → rate (EUR/XXX, e.g. 1 EUR = 1.08 USD)
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Arkhos/1.0)',
  'Accept': 'application/json',
};

// Inicio: noviembre 2024
const PERIOD1 = Math.floor(new Date('2024-11-01').getTime() / 1000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lastDayOfMonth(year: number, month: number): string {
  // month is 0-indexed (JS Date)
  const d = new Date(Date.UTC(year, month + 1, 0));
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]!;
  const candidate = d.toISOString().split('T')[0]!;
  return candidate > todayStr ? todayStr : candidate;
}

function timestampToEndOfMonth(unix: number): string {
  const d = new Date(unix * 1000);
  return lastDayOfMonth(d.getUTCFullYear(), d.getUTCMonth());
}

async function fetchYahooMonthly(ticker: string): Promise<MonthlyPrice[]> {
  const period2 = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${PERIOD1}&period2=${period2}&interval=1mo`;

  const res = await fetch(url, {
    headers: YAHOO_HEADERS,
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} for ${ticker}`);

  const data = (await res.json()) as YahooChartResponse;
  if (data.chart.error) throw new Error(`Yahoo error for ${ticker}: ${data.chart.error.description}`);

  const result = data.chart.result?.[0];
  if (!result) throw new Error(`No result from Yahoo for ${ticker}`);

  const closes = result.indicators.adjclose?.[0]?.adjclose
    ?? result.indicators.quote?.[0]?.close
    ?? [];

  return result.timestamp
    .map((ts, i) => ({ ts, price: closes[i] ?? null }))
    .filter((item): item is { ts: number; price: number } => item.price !== null && item.price > 0)
    .map(({ ts, price }) => ({
      date: timestampToEndOfMonth(ts),
      price,
    }));
}

async function fetchForexHistory(): Promise<{
  usd: ForexHistory;
  gbp: ForexHistory;
  hkd: ForexHistory;
}> {
  const [usdData, gbpData, hkdData] = await Promise.all([
    fetchYahooMonthly('EURUSD=X'),
    fetchYahooMonthly('EURGBP=X'),
    fetchYahooMonthly('EURHKD=X'),
  ]);

  const toMap = (prices: MonthlyPrice[]): ForexHistory =>
    Object.fromEntries(prices.map(({ date, price }) => [date, price]));

  return {
    usd: toMap(usdData),
    gbp: toMap(gbpData),
    hkd: toMap(hkdData),
  };
}

// Busca el tipo de cambio más cercano anterior o igual a una fecha dada
function getForexRate(history: ForexHistory, date: string): number | null {
  const sorted = Object.keys(history).sort();
  const candidates = sorted.filter(d => d <= date);
  if (candidates.length === 0) return null;
  const latest = candidates[candidates.length - 1]!;
  return history[latest] ?? null;
}

function convertToEur(
  price: number,
  currency: string,
  date: string,
  forex: { usd: ForexHistory; gbp: ForexHistory; hkd: ForexHistory },
): number | null {
  switch (currency) {
    case 'EUR':
      return price;
    case 'USD': {
      const rate = getForexRate(forex.usd, date);
      return rate ? price / rate : null;
    }
    case 'GBP': {
      const rate = getForexRate(forex.gbp, date);
      return rate ? price / rate : null;
    }
    case 'GBX': {
      // GBX = peniques, 100 GBX = 1 GBP
      const rate = getForexRate(forex.gbp, date);
      return rate ? (price / 100) / rate : null;
    }
    case 'HKD': {
      const rate = getForexRate(forex.hkd, date);
      return rate ? price / rate : null;
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// POST /api/patrimonio/prices/historical
// ---------------------------------------------------------------------------

export async function POST(): Promise<Response> {
  try {
    // 1. Auth guard
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Obtener tipos de cambio históricos mensuales
    let forex: { usd: ForexHistory; gbp: ForexHistory; hkd: ForexHistory };
    try {
      forex = await fetchForexHistory();
    } catch (e) {
      return Response.json(
        { error: `Error al obtener forex histórico: ${String(e)}` },
        { status: 500 },
      );
    }

    // 3. Para cada ISIN con ticker: fetch precios históricos mensuales → convertir a EUR
    const priceRows: Array<{
      user_id: string;
      isin: string;
      price_date: string;
      price_eur: number;
      source: string;
    }> = [];

    const errors: string[] = [];
    let assetsProcessed = 0;

    for (const [isin, config] of Object.entries(TICKER_CONFIG)) {
      try {
        const monthlyPrices = await fetchYahooMonthly(config.ticker);

        for (const { date, price } of monthlyPrices) {
          const priceEur = convertToEur(price, config.currency, date, forex);
          if (priceEur === null || priceEur <= 0) continue;

          priceRows.push({
            user_id: user.id,
            isin,
            price_date: date,
            price_eur: Math.round(priceEur * 1_000_000) / 1_000_000,
            source: 'yahoo',
          });
        }

        assetsProcessed++;
      } catch (e) {
        errors.push(`${config.ticker} (${isin}): ${String(e)}`);
      }

      // Pequeña pausa para no saturar Yahoo Finance
      await new Promise(r => setTimeout(r, 200));
    }

    if (priceRows.length === 0) {
      return Response.json(
        { error: 'No se obtuvieron precios', errors },
        { status: 500 },
      );
    }

    // 4. Upsert en asset_price_history (lotes de 500 para no exceder límites)
    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < priceRows.length; i += BATCH) {
      const batch = priceRows.slice(i, i + BATCH);
      const { error: upsertError } = await supabase
        .from('asset_price_history')
        .upsert(batch, { onConflict: 'user_id,isin,price_date' });
      if (upsertError) {
        errors.push(`Upsert batch ${i}: ${upsertError.message}`);
      } else {
        inserted += batch.length;
      }
    }

    // 5. Regenerar snapshots históricos con los nuevos precios
    const { error: rpcError } = await supabase.rpc('generate_historical_snapshots', {
      p_user_id: user.id,
    });

    if (rpcError) {
      errors.push(`generate_historical_snapshots: ${rpcError.message}`);
    }

    return Response.json({
      assets_processed: assetsProcessed,
      prices_inserted: inserted,
      snapshots_regenerated: !rpcError,
      errors,
    });

  } catch (e) {
    const message = process.env.NODE_ENV === 'development' ? String(e) : 'Error interno';
    return Response.json({ error: message }, { status: 500 });
  }
}
