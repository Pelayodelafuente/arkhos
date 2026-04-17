/**
 * Verifica todos los tickers de Trade Republic contra Yahoo Finance histórico.
 * Busca alternativas para tickers Stuttgart (.SG) que fallen.
 * Ejecutar: pnpm exec tsx scripts/verify-tickers.ts
 */

// Nov 1, 2024 → Apr 17, 2026
const PERIOD1 = Math.floor(new Date('2024-11-01').getTime() / 1000);
const PERIOD2 = Math.floor(new Date('2026-04-17').getTime() / 1000);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Arkhos/1.0)',
  'Accept': 'application/json',
};

interface TickerConfig {
  isin: string;
  name: string;
  ticker: string;
  currency: string;
  source: string;
  alternatives?: string[];
}

// Todos los tickers TR — incluyendo acciones USA en Yahoo (no Finnhub) para histórico
const TICKERS: TickerConfig[] = [
  // ETFs EUR - Euronext/Xetra
  { isin: 'IE00B5BMR087', name: 'iShares S&P 500',          ticker: 'SXR8.DE',  currency: 'EUR', source: 'yahoo' },
  { isin: 'IE00B4L5Y983', name: 'iShares MSCI World',       ticker: 'IWDA.AS',  currency: 'EUR', source: 'yahoo' },
  { isin: 'IE00B53SZB19', name: 'iShares NASDAQ 100',       ticker: 'CNDX.AS',  currency: 'EUR', source: 'yahoo' },
  { isin: 'IE00BK5BR733', name: 'Vanguard EM (VFEM)',        ticker: 'VFEA.L',   currency: 'USD', source: 'yahoo' },
  { isin: 'IE00B6R52259', name: 'iShares MSCI ACWI',        ticker: 'SSAC.AS',  currency: 'EUR', source: 'yahoo' },
  { isin: 'IE00BGV5VN51', name: 'Xtrackers AI & Big Data',  ticker: 'XAIX.DE',  currency: 'EUR', source: 'yahoo' },
  { isin: 'IE0002Y8CX98', name: 'WisdomTree Europe Defence',ticker: 'EUDF.DE',  currency: 'EUR', source: 'yahoo' },
  { isin: 'IE000GA3D489', name: 'ARK Innovation UCITS',     ticker: 'ARXK.DE',  currency: 'EUR', source: 'yahoo' },
  { isin: 'IE000U58J0M1', name: 'iShares Clean Energy',     ticker: 'INRA.AS',  currency: 'USD', source: 'yahoo' },
  // Stuttgart — posibles fallos, con alternativas
  { isin: 'IE00BMH5XY61', name: 'Global X E-Commerce',      ticker: 'IE00BMH5XY61.SG', currency: 'EUR', source: 'yahoo',
    alternatives: ['ECOM.L', 'ECOM.MI', 'ECOM.DE', 'ECOM.F'] },
  { isin: 'IE0003A512E4', name: 'ARK AI & Robotics',        ticker: 'IE0003A512E4.SG', currency: 'EUR', source: 'yahoo',
    alternatives: ['ARKY.L', 'ARKY.MI', '2B76.DE', 'ARKY.DE'] },
  // ETFs LSE GBX
  { isin: 'LU0322253906', name: 'Xtrackers Europe Small Cap',ticker: 'XXSC.L',   currency: 'GBX', source: 'yahoo' },
  // ETFs LSE USD
  { isin: 'IE00B4ND3602', name: 'iShares Physical Gold',    ticker: 'IGLN.L',   currency: 'USD', source: 'yahoo' },
  { isin: 'IE00B4NCWG09', name: 'iShares Physical Silver',  ticker: 'ISLN.L',   currency: 'USD', source: 'yahoo' },
  { isin: 'IE00BM67HV82', name: 'Xtrackers World Industrials', ticker: 'XDWI.L', currency: 'USD', source: 'yahoo' },
  // ETFs LSE GBP
  { isin: 'IE00BGYWSW13', name: 'Vanguard USD Corp Bond',   ticker: 'VDCP.L',   currency: 'GBP', source: 'yahoo' },
  // Acciones USA — Yahoo tiene histórico directo (sin necesidad de Finnhub)
  { isin: 'US67066G1040', name: 'NVIDIA',                   ticker: 'NVDA',     currency: 'USD', source: 'yahoo' },
  { isin: 'US88160R1014', name: 'Tesla',                    ticker: 'TSLA',     currency: 'USD', source: 'yahoo' },
  { isin: 'US02079K1079', name: 'Alphabet (Google)',         ticker: 'GOOGL',    currency: 'USD', source: 'yahoo' },
  { isin: 'US30303M1027', name: 'Meta',                     ticker: 'META',     currency: 'USD', source: 'yahoo' },
  { isin: 'US0231351067', name: 'Amazon',                   ticker: 'AMZN',     currency: 'USD', source: 'yahoo' },
  { isin: 'US90353T1007', name: 'Uber',                     ticker: 'UBER',     currency: 'USD', source: 'yahoo' },
  { isin: 'US26740W1099', name: 'D-Wave Quantum',           ticker: 'QBTS',     currency: 'USD', source: 'yahoo' },
  { isin: 'US8740391003', name: 'Taiwan Semiconductor',     ticker: 'TSM',      currency: 'USD', source: 'yahoo' },
  { isin: 'US70450Y1038', name: 'PayPal',                   ticker: 'PYPL',     currency: 'USD', source: 'yahoo' },
  { isin: 'US91324P1021', name: 'UnitedHealth',             ticker: 'UNH',      currency: 'USD', source: 'yahoo' },
  { isin: 'US0079031078', name: 'AMD',                      ticker: 'AMD',      currency: 'USD', source: 'yahoo' },
  // Hong Kong
  { isin: 'CNE100000296', name: 'BYD (H)',                  ticker: '1211.HK',  currency: 'HKD', source: 'yahoo' },
  { isin: 'KYG9830T1067', name: 'Xiaomi',                   ticker: '1810.HK',  currency: 'HKD', source: 'yahoo' },
  // Forex pares (para histórico de tipos de cambio)
  { isin: 'FOREX_USDEUR', name: 'USD → EUR',                ticker: 'EURUSD=X', currency: 'USD', source: 'yahoo' },
  { isin: 'FOREX_GBPEUR', name: 'GBP → EUR',                ticker: 'EURGBP=X', currency: 'GBP', source: 'yahoo' },
  { isin: 'FOREX_HKDEUR', name: 'HKD → EUR',                ticker: 'EURHKD=X', currency: 'HKD', source: 'yahoo' },
];

async function fetchYahooHistorical(ticker: string): Promise<{
  ok: boolean;
  months: number;
  firstPrice: number | null;
  lastPrice: number | null;
  currency: string | null;
  error?: string;
}> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${PERIOD1}&period2=${PERIOD2}&interval=1mo`;
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { ok: false, months: 0, firstPrice: null, lastPrice: null, currency: null, error: `HTTP ${res.status}` };
    const data = await res.json() as {
      chart: {
        result?: Array<{
          meta: { currency: string };
          timestamp: number[];
          indicators: { adjclose?: Array<{ adjclose: (number | null)[] }>; quote?: Array<{ close: (number | null)[] }> };
        }>;
        error?: { description: string };
      };
    };
    if (data.chart.error) return { ok: false, months: 0, firstPrice: null, lastPrice: null, currency: null, error: data.chart.error.description };
    const result = data.chart.result?.[0];
    if (!result) return { ok: false, months: 0, firstPrice: null, lastPrice: null, currency: null, error: 'No result' };

    const closes = result.indicators.adjclose?.[0]?.adjclose ?? result.indicators.quote?.[0]?.close ?? [];
    const validCloses = closes.filter((p): p is number => p !== null && !isNaN(p));

    return {
      ok: validCloses.length > 0,
      months: validCloses.length,
      firstPrice: validCloses[0] ?? null,
      lastPrice: validCloses[validCloses.length - 1] ?? null,
      currency: result.meta.currency,
    };
  } catch (e) {
    return { ok: false, months: 0, firstPrice: null, lastPrice: null, currency: null, error: String(e) };
  }
}

async function main() {
  console.log('=== VERIFICACIÓN DE TICKERS HISTÓRICOS — ARKHOS PATRIMONIO ===\n');
  console.log(`Período: Nov 2024 → Abr 2026 (intervalo mensual)\n`);

  const results: Array<{ config: TickerConfig; status: string; detail: string; finalTicker?: string }> = [];

  for (const config of TICKERS) {
    process.stdout.write(`Probando ${config.ticker.padEnd(22)} (${config.name.substring(0, 30).padEnd(30)}) ... `);

    const result = await fetchYahooHistorical(config.ticker);

    if (result.ok) {
      const detail = `${result.months} meses | first=${result.firstPrice?.toFixed(2)} last=${result.lastPrice?.toFixed(2)} ${result.currency}`;
      console.log(`✅  ${detail}`);
      results.push({ config, status: 'OK', detail, finalTicker: config.ticker });
    } else {
      // Intentar alternativas si existen
      let found = false;
      if (config.alternatives?.length) {
        for (const alt of config.alternatives) {
          process.stdout.write(`\n  → Probando alternativa ${alt} ... `);
          const altResult = await fetchYahooHistorical(alt);
          if (altResult.ok) {
            const detail = `${altResult.months} meses | first=${altResult.firstPrice?.toFixed(2)} last=${altResult.lastPrice?.toFixed(2)} ${altResult.currency}`;
            console.log(`✅  ${detail}`);
            results.push({ config, status: 'ALT', detail: `Alternativa: ${alt} | ${detail}`, finalTicker: alt });
            found = true;
            break;
          } else {
            console.log(`❌  ${altResult.error}`);
          }
        }
      }
      if (!found) {
        console.log(`❌  ${result.error}`);
        results.push({ config, status: 'FAIL', detail: result.error ?? 'Error desconocido' });
      }
    }

    // Pequeña pausa para no ser bloqueados
    await new Promise(r => setTimeout(r, 300));
  }

  // Resumen
  console.log('\n=== RESUMEN ===\n');
  const ok = results.filter(r => r.status === 'OK');
  const alt = results.filter(r => r.status === 'ALT');
  const fail = results.filter(r => r.status === 'FAIL');

  console.log(`✅ OK:          ${ok.length} tickers`);
  console.log(`🔄 Alternativa: ${alt.length} tickers`);
  console.log(`❌ FALLO:       ${fail.length} tickers\n`);

  if (alt.length > 0) {
    console.log('--- CAMBIOS DE TICKER NECESARIOS ---');
    for (const r of alt) {
      console.log(`  ${r.config.isin} (${r.config.name})`);
      console.log(`    Actual: ${r.config.ticker}  →  Nuevo: ${r.finalTicker}`);
    }
    console.log('');
  }

  if (fail.length > 0) {
    console.log('--- TICKERS SIN HISTÓRICO (requieren acción manual) ---');
    for (const r of fail) {
      console.log(`  ${r.config.ticker} (${r.config.name}) — ${r.detail}`);
    }
    console.log('');
  }

  if (fail.length === 0 && alt.length === 0) {
    console.log('Todos los tickers tienen histórico correcto. Podemos proceder con la implementación.');
  }
}

main().catch(console.error);
