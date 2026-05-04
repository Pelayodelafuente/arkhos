'use client';

interface CachedMetricValue {
  current: number;
  change24h?: number;
  changePct24h?: number;
  history?: Array<{ date: string; value: number }>;
  label?: string;
}

interface PulseData {
  vix: CachedMetricValue;
  fearGreed: CachedMetricValue;
  dxy: CachedMetricValue;
  eurusd: CachedMetricValue;
  us10y: CachedMetricValue;
  gold: CachedMetricValue;
  bitcoin: CachedMetricValue;
  m2: CachedMetricValue;
  fetchedAt: string;
  errors: string[];
}

interface PortfolioMarketData {
  rebalanceAlerts: Array<{ severity: string }>;
}

interface DailySummaryProps {
  pulseData: PulseData | null;
  portfolioData: PortfolioMarketData | null;
}

type SummaryType = 'positive' | 'negative' | 'neutral' | 'warning';

interface SummaryItem {
  icon: string;
  text: string;
  type: SummaryType;
}

function generateSummary(pulse: PulseData, portfolio: PortfolioMarketData | null): SummaryItem[] {
  const items: SummaryItem[] = [];

  // VIX
  if (pulse.vix.current > 0) {
    if (pulse.vix.current > 30) {
      items.push({ icon: '⚠️', text: `VIX en ${pulse.vix.current.toFixed(1)} — pánico en mercados. Momento histórico de oportunidad para inversores de largo plazo.`, type: 'warning' });
    } else if (pulse.vix.current > 20) {
      items.push({ icon: '🟡', text: `VIX en ${pulse.vix.current.toFixed(1)} — volatilidad elevada. Mercado con tensión pero dentro de lo normal.`, type: 'neutral' });
    } else {
      items.push({ icon: '✅', text: `VIX en ${pulse.vix.current.toFixed(1)} — mercado tranquilo. Buenas condiciones para posiciones a largo plazo.`, type: 'positive' });
    }
  }

  // Fear & Greed
  if (pulse.fearGreed.current > 0) {
    if (pulse.fearGreed.current < 25) {
      items.push({ icon: '🔴', text: `Miedo extremo en crypto (${pulse.fearGreed.current}/100). Históricamente señal de potencial entrada en BTC/ETH.`, type: 'warning' });
    } else if (pulse.fearGreed.current > 75) {
      items.push({ icon: '🟡', text: `Codicia en crypto (${pulse.fearGreed.current}/100). Considera revisar tu posición antes de añadir más exposición.`, type: 'warning' });
    }
  }

  // EUR/USD
  const changePct = pulse.eurusd.changePct24h ?? 0;
  if (Math.abs(changePct) > 0.5) {
    const direction = changePct > 0 ? 'subió' : 'bajó';
    const portfolioImpact = changePct > 0 ? 'negativo' : 'positivo';
    items.push({
      icon: '💱',
      text: `EUR/USD ${direction} ${Math.abs(changePct).toFixed(2)}% hoy (${pulse.eurusd.current.toFixed(4)}). Impacto ${portfolioImpact} en tu cartera USD (~85% exposición).`,
      type: changePct > 0 ? 'negative' : 'positive',
    });
  }

  // Oro
  const goldChange = pulse.gold.changePct24h ?? 0;
  if (Math.abs(goldChange) > 1.5) {
    const direction = goldChange > 0 ? 'sube' : 'baja';
    items.push({
      icon: '🥇',
      text: `Oro ${direction} ${Math.abs(goldChange).toFixed(1)}% hoy ($${pulse.gold.current.toLocaleString('en-US', { maximumFractionDigits: 0 })}). Afecta directamente a tus posiciones IGLN e ISLN.`,
      type: goldChange > 0 ? 'positive' : 'negative',
    });
  }

  // Bitcoin
  const btcChange = pulse.bitcoin.changePct24h ?? 0;
  if (Math.abs(btcChange) > 3 && pulse.bitcoin.current > 0) {
    const direction = btcChange > 0 ? 'sube' : 'baja';
    items.push({
      icon: '₿',
      text: `Bitcoin ${direction} ${Math.abs(btcChange).toFixed(1)}% ($${pulse.bitcoin.current.toLocaleString('en-US', { maximumFractionDigits: 0 })}). ${btcChange > 0 ? 'Positivo para tu exposición crypto.' : 'Presión en tu posición crypto.'}`,
      type: btcChange > 0 ? 'positive' : 'negative',
    });
  }

  // US 10Y
  if (pulse.us10y.current > 4.5) {
    items.push({
      icon: '📈',
      text: `Bono USA 10Y en ${pulse.us10y.current.toFixed(2)}%. Tipos altos presionan tus acciones growth y el precio de tus bonos VDCP.`,
      type: 'warning',
    });
  }

  // Rebalanceo
  if (portfolio?.rebalanceAlerts) {
    const critical = portfolio.rebalanceAlerts.filter(a => a.severity !== 'info');
    if (critical.length > 0) {
      items.push({
        icon: '⚖️',
        text: `${critical.length} clase${critical.length > 1 ? 's' : ''} de activo fuera del rango objetivo. Revisa el tab "Mi Cartera" para ver qué rebalancear.`,
        type: 'warning',
      });
    }
  }

  if (items.length === 1 && items[0]!.type === 'positive') {
    items.push({ icon: '📊', text: 'Mercados en calma. Sin señales relevantes hoy. Mantén tu estrategia de largo plazo.', type: 'neutral' });
  }

  return items.slice(0, 5);
}

const TYPE_CLASSES: Record<SummaryType, string> = {
  positive: 'text-emerald-600',
  negative: 'text-red-600',
  warning: 'text-amber-600',
  neutral: 'text-text-secondary',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'ahora mismo';
  if (diff < 60) return `hace ${diff}m`;
  const h = Math.floor(diff / 60);
  return `hace ${h}h`;
}

export function DailySummary({ pulseData, portfolioData }: DailySummaryProps) {
  if (!pulseData) return null;

  const items = generateSummary(pulseData, portfolioData);
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-sand px-4 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
          Estado hoy
        </span>
        <span className="text-[11px] text-text-tertiary">·</span>
        <span className="text-[11px] text-text-tertiary capitalize">
          {formatDate(pulseData.fetchedAt)}
        </span>
        <span className="ml-auto text-[10px] text-text-tertiary">
          Actualizado {timeAgo(pulseData.fetchedAt)}
        </span>
      </div>
      <div className="divide-y divide-border">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 shrink-0 text-base leading-none">{item.icon}</span>
            <p className={`text-sm leading-relaxed ${TYPE_CLASSES[item.type]}`}>
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
