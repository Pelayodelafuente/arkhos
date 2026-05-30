-- ============================================================
-- 052: Trade Republic sync log
-- Tabla de auditoría para ejecuciones del sync automático con TR
-- ============================================================

CREATE TABLE IF NOT EXISTS tr_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'error')),
  positions_updated INTEGER DEFAULT 0,
  transactions_upserted INTEGER DEFAULT 0,
  passive_income_upserted INTEGER DEFAULT 0,
  cash_eur NUMERIC(15, 2),
  error_message TEXT,
  trigger_source TEXT DEFAULT 'cron'
    CHECK (trigger_source IN ('cron', 'manual', 'local'))
);

CREATE INDEX IF NOT EXISTS idx_tr_sync_log_user_date
  ON tr_sync_log(user_id, started_at DESC);

ALTER TABLE tr_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON tr_sync_log
  FOR ALL USING (auth.uid() = user_id);
