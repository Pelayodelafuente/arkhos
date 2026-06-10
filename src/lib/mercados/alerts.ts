import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RebalanceAlert } from './portfolio-market';

let _admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _admin;
}

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export interface MarketAlert {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  is_read: boolean;
  triggered_at: string;
  metric_value?: number;
  threshold_value?: number;
}

// ─── CRUD ALERTAS ────────────────────────────────────────────────────────────

export async function getUserAlerts(userId: string): Promise<MarketAlert[]> {
  const admin = getAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from('market_alerts')
    .select('id, alert_type, title, message, severity, is_read, triggered_at, metric_value, threshold_value')
    .eq('user_id', userId)
    .order('triggered_at', { ascending: false })
    .limit(30);

  if (error) return [];
  return (data ?? []) as MarketAlert[];
}

export async function markAlertRead(alertId: string, userId: string): Promise<void> {
  const admin = getAdmin();
  if (!admin) return;
  // El cliente admin salta RLS: el filtro por user_id es obligatorio (evita IDOR)
  await admin
    .from('market_alerts')
    .update({ is_read: true })
    .eq('id', alertId)
    .eq('user_id', userId);
}

export async function markAllAlertsRead(userId: string): Promise<void> {
  const admin = getAdmin();
  if (!admin) return;
  await admin
    .from('market_alerts')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}

export async function createAlert(
  userId: string,
  alert: Omit<MarketAlert, 'id' | 'is_read' | 'triggered_at'>
): Promise<void> {
  const admin = getAdmin();
  if (!admin) return;
  await admin.from('market_alerts').insert({
    user_id: userId,
    alert_type: alert.alert_type,
    title: alert.title,
    message: alert.message,
    severity: alert.severity,
    metric_value: alert.metric_value ?? null,
    threshold_value: alert.threshold_value ?? null,
    is_read: false,
    triggered_at: new Date().toISOString(),
  });
}

// ─── EVALUACIÓN AUTOMÁTICA ───────────────────────────────────────────────────

interface PulseSnapshot {
  vix: { current: number };
  fearGreed: { current: number };
  dxy: { current: number };
  us10y: { current: number };
}

const PULSE_RULES = [
  {
    type: 'vix_spike',
    check: (p: PulseSnapshot) => p.vix.current > 35,
    title: 'Pánico en mercados — VIX > 35',
    message: (p: PulseSnapshot) =>
      `El VIX ha alcanzado ${p.vix.current.toFixed(1)}, nivel de pánico extremo. Históricamente, estos niveles son oportunidades de compra a largo plazo.`,
    severity: 'critical' as const,
    metric: (p: PulseSnapshot) => p.vix.current,
    threshold: 35,
    cooldownH: 24,
  },
  {
    type: 'vix_low',
    check: (p: PulseSnapshot) => p.vix.current > 0 && p.vix.current < 12,
    title: 'Complacencia extrema — VIX < 12',
    message: (p: PulseSnapshot) =>
      `El VIX está en ${p.vix.current.toFixed(1)}, nivel de complacencia. Considera reducir riesgo o revisar stop-losses.`,
    severity: 'warning' as const,
    metric: (p: PulseSnapshot) => p.vix.current,
    threshold: 12,
    cooldownH: 48,
  },
  {
    type: 'fear_greed_extreme_fear',
    check: (p: PulseSnapshot) => p.fearGreed.current > 0 && p.fearGreed.current < 20,
    title: 'Miedo extremo en crypto — F&G < 20',
    message: (p: PulseSnapshot) =>
      `El índice Fear & Greed está en ${p.fearGreed.current}/100. Comprar en miedo extremo genera retornos positivos a 6-12 meses.`,
    severity: 'warning' as const,
    metric: (p: PulseSnapshot) => p.fearGreed.current,
    threshold: 20,
    cooldownH: 24,
  },
  {
    type: 'fear_greed_extreme_greed',
    check: (p: PulseSnapshot) => p.fearGreed.current > 80,
    title: 'Codicia extrema en crypto — F&G > 80',
    message: (p: PulseSnapshot) =>
      `El índice Fear & Greed está en ${p.fearGreed.current}/100. Considera tomar beneficios parciales en posiciones crypto.`,
    severity: 'warning' as const,
    metric: (p: PulseSnapshot) => p.fearGreed.current,
    threshold: 80,
    cooldownH: 24,
  },
  {
    type: 'dxy_strong',
    check: (p: PulseSnapshot) => p.dxy.current > 107,
    title: 'Dólar muy fuerte — DXY > 107',
    message: (p: PulseSnapshot) =>
      `El DXY está en ${p.dxy.current.toFixed(2)}. Presión sobre crypto, oro y emergentes. Tu cartera tiene ~85% en USD.`,
    severity: 'info' as const,
    metric: (p: PulseSnapshot) => p.dxy.current,
    threshold: 107,
    cooldownH: 48,
  },
  {
    type: 'us10y_high',
    check: (p: PulseSnapshot) => p.us10y.current > 5.0,
    title: 'Bono USA 10Y > 5% — Presión sobre activos',
    message: (p: PulseSnapshot) =>
      `El bono USA 10Y está en ${p.us10y.current.toFixed(2)}%. Nivel históricamente alto — presión sobre acciones growth y crypto.`,
    severity: 'warning' as const,
    metric: (p: PulseSnapshot) => p.us10y.current,
    threshold: 5.0,
    cooldownH: 48,
  },
];

export async function evaluatePulseAlerts(userId: string, pulse: PulseSnapshot): Promise<void> {
  const admin = getAdmin();
  if (!admin) return;

  for (const rule of PULSE_RULES) {
    if (!rule.check(pulse)) continue;

    const cutoff = new Date(Date.now() - rule.cooldownH * 60 * 60 * 1000).toISOString();
    const { data: existing } = await admin
      .from('market_alerts')
      .select('id')
      .eq('user_id', userId)
      .eq('alert_type', rule.type)
      .gte('triggered_at', cutoff)
      .limit(1);

    if (existing && existing.length > 0) continue;

    await createAlert(userId, {
      alert_type: rule.type,
      title: rule.title,
      message: rule.message(pulse),
      severity: rule.severity,
      metric_value: rule.metric(pulse),
      threshold_value: rule.threshold,
    });
  }
}

export async function createRebalanceAlerts(
  userId: string,
  rebalanceAlerts: RebalanceAlert[]
): Promise<void> {
  const admin = getAdmin();
  if (!admin) return;

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const alert of rebalanceAlerts) {
    if (alert.severity === 'info') continue;

    const alertType = `rebalance_${alert.assetClass.replace(/\s+/g, '_').toLowerCase()}`;
    const { data: existing } = await admin
      .from('market_alerts')
      .select('id')
      .eq('user_id', userId)
      .eq('alert_type', alertType)
      .gte('triggered_at', cutoff)
      .limit(1);

    if (existing && existing.length > 0) continue;

    await createAlert(userId, {
      alert_type: alertType,
      title: `Rebalanceo sugerido — ${alert.assetClass}`,
      message: alert.message,
      severity: alert.severity,
      metric_value: alert.currentPct,
      threshold_value: alert.targetPct,
    });
  }
}
