-- =====================================================
-- MERCADOS MODULE TABLES
-- Migration 048
-- =====================================================

-- Caché de datos de mercado (evita exceder límites de APIs)
CREATE TABLE IF NOT EXISTS market_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  metric TEXT NOT NULL,
  value JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  ttl_hours INT DEFAULT 6,
  UNIQUE(source, metric)
);

-- Sin RLS (datos públicos de mercado, no son del usuario)
ALTER TABLE market_data_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only for market_data_cache"
  ON market_data_cache FOR ALL
  USING (false); -- Solo accesible via service role key

-- Alertas generadas para el usuario
CREATE TABLE IF NOT EXISTS market_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  metric_value DECIMAL,
  threshold_value DECIMAL,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE market_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own alerts"
  ON market_alerts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts"
  ON market_alerts FOR UPDATE
  USING (auth.uid() = user_id);
CREATE INDEX idx_market_alerts_user_unread
  ON market_alerts(user_id, is_read, triggered_at DESC);

-- Configuración de alertas del usuario
CREATE TABLE IF NOT EXISTS alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  threshold_value DECIMAL,
  channel TEXT[] NOT NULL DEFAULT ARRAY['in_app'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, alert_type)
);

ALTER TABLE alert_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own alert configs"
  ON alert_configs FOR ALL
  USING (auth.uid() = user_id);

-- Análisis IA guardados
CREATE TABLE IF NOT EXISTS market_ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('weekly', 'on_demand', 'alert_explanation', 'portfolio_review')),
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  market_context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE market_ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own analyses"
  ON market_ai_analyses FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analyses"
  ON market_ai_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_market_ai_analyses_user_date
  ON market_ai_analyses(user_id, created_at DESC);
