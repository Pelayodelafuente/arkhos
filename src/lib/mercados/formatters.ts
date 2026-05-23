export function formatMetricValue(metricId: string, value: number): string {
  if (value === 0) return '—';

  switch (metricId) {
    case 'vix':
      return value.toFixed(1);
    case 'fearGreed':
      return Math.round(value).toString();
    case 'dxy':
      return value.toFixed(2);
    case 'eurusd':
      return value.toFixed(4);
    case 'us10y':
      return `${value.toFixed(2)}%`;
    case 'gold':
      return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    case 'bitcoin':
      return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    case 'm2':
      return `$${value.toFixed(1).replace('.', ',')} T`;
    default:
      return value.toString();
  }
}

export function formatChange(change: number, metricId: string): string {
  if (!change) return '';
  const sign = change > 0 ? '+' : '';

  if (metricId === 'eurusd') return `${sign}${change.toFixed(4)}`;
  if (metricId === 'gold' || metricId === 'bitcoin') {
    return `${sign}$${Math.round(Math.abs(change)).toLocaleString()}`;
  }
  if (metricId === 'us10y') return `${sign}${change.toFixed(3)}%`;
  return `${sign}${change.toFixed(2)}`;
}

export function formatChangePct(pct: number): string {
  if (!pct) return '';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function timeAgo(dateString: string): string {
  const diff = (Date.now() - new Date(dateString).getTime()) / 1000 / 60;
  if (diff < 60) return `hace ${Math.round(diff)}min`;
  if (diff < 1440) return `hace ${Math.round(diff / 60)}h`;
  return `hace ${Math.round(diff / 1440)}d`;
}
