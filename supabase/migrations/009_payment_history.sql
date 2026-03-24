-- ══════════════════════════════════════
-- Arkhos — Payment History & Alert Settings
-- Migration 009: subscription_payments + alert settings
-- ══════════════════════════════════════

-- ─── SUBSCRIPTION PAYMENTS ──────────────

CREATE TABLE subscription_payments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID        NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT        DEFAULT 'EUR',
  paid_at         DATE        NOT NULL,
  cycle           TEXT        NOT NULL,
  auto_generated  BOOLEAN     DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sub_payments_sub ON subscription_payments(subscription_id);
CREATE INDEX idx_sub_payments_user ON subscription_payments(user_id);
CREATE INDEX idx_sub_payments_date ON subscription_payments(user_id, paid_at);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own payments" ON subscription_payments
  FOR ALL USING (auth.uid() = user_id);

-- ─── ALERT SETTINGS ──────────────────

ALTER TABLE user_gastos_settings ADD COLUMN IF NOT EXISTS alert_days_before INTEGER DEFAULT 1;
ALTER TABLE user_gastos_settings ADD COLUMN IF NOT EXISTS alert_renewal_days INTEGER DEFAULT 30;
ALTER TABLE user_gastos_settings ADD COLUMN IF NOT EXISTS alert_enabled BOOLEAN DEFAULT true;
