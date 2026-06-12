// ══════════════════════════════════════
// Arkhos — Watchlist ETFs del Dashboard (F4.3)
// IGLN y CSPX dejaban "—": no había fuente de precio.
// Se usan las cotizaciones EUR que replican las posiciones reales de la cartera:
//   IGLN (iShares Physical Gold, IE00B4ND3602) → PPFB.DE (Xetra, EUR)
//   CSPX (iShares Core S&P 500, IE00B5BMR087) → SXR8.DE (Xetra, EUR)
// Mismo mapeo ISIN→ticker que TICKER_CONFIG en lib/patrimonio/price-service.ts.
// ══════════════════════════════════════

import { fetchWithTimeout } from '@/lib/utils/fetch-timeout';
import { getCachedMetric, setCachedMetric } from './cache';

export interface EtfQuote {
  price: number | null;
  changePct: number | null;
}

const ETF_TICKERS: Record<'igln' | 'cspx', string> = {
  igln: 'PPFB.DE',
  cspx: 'SXR8.DE',
};

const TTL_HOURS = 6;

async function fetchYahooLast(
  ticker: string
): Promise<{ current: number; changePct: number }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
  const res = await fetchWithTimeout(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Yahoo Finance error ${res.status} for ${ticker}`);

  const json = (await res.json()) as {
    chart?: {
      result?: Array<{ indicators?: { quote?: Array<{ close?: number[] }> } }>;
    };
  };
  const closes = (json.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter(
    (c): c is number => c != null && !isNaN(c)
  );
  const current = closes[closes.length - 1];
  if (current == null) throw new Error(`No data for ${ticker}`);
  const prev = closes[closes.length - 2] ?? current;

  return {
    current,
    changePct: prev ? ((current - prev) / prev) * 100 : 0,
  };
}

/** Cotizaciones EUR de los ETFs de la watchlist del Dashboard, con caché en DB. */
export async function getWatchlistEtfQuotes(): Promise<Record<'igln' | 'cspx', EtfQuote>> {
  const entries = await Promise.all(
    (Object.keys(ETF_TICKERS) as Array<'igln' | 'cspx'>).map(
      async (key): Promise<[string, EtfQuote]> => {
        try {
          const cached = await getCachedMetric('Yahoo', key);
          if (cached) {
            return [key, { price: cached.value.current, changePct: cached.value.changePct24h ?? null }];
          }
          const quote = await fetchYahooLast(ETF_TICKERS[key]);
          await setCachedMetric(
            'Yahoo',
            key,
            { current: quote.current, changePct24h: parseFloat(quote.changePct.toFixed(2)) },
            TTL_HOURS
          );
          return [key, { price: quote.current, changePct: quote.changePct }];
        } catch {
          return [key, { price: null, changePct: null }];
        }
      }
    )
  );
  return Object.fromEntries(entries) as Record<'igln' | 'cspx', EtfQuote>;
}
