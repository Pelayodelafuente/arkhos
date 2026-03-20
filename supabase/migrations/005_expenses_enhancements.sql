-- ══════════════════════════════════════
-- Arkhos — Expenses Enhancements
-- Migration 005: price_history + user_gastos_settings + status field
-- ══════════════════════════════════════

-- ─── ADD STATUS FIELD TO SUBSCRIPTIONS ──────────
-- Replace is_active boolean with richer status
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'trial'));
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS service_key TEXT;

-- Migrate existing data: is_active=false → status='paused'
UPDATE subscriptions SET status = 'paused' WHERE is_active = false;

-- ─── SUBSCRIPTION PRICE HISTORY ──────────────

CREATE TABLE IF NOT EXISTS subscription_price_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID        NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  old_amount      NUMERIC(10,2) NOT NULL,
  new_amount      NUMERIC(10,2) NOT NULL,
  changed_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_price_history_sub ON subscription_price_history(subscription_id);
CREATE INDEX idx_price_history_user ON subscription_price_history(user_id);

ALTER TABLE subscription_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own price history"
  ON subscription_price_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own price history"
  ON subscription_price_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger: auto-log price changes
CREATE OR REPLACE FUNCTION log_subscription_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.amount IS DISTINCT FROM NEW.amount THEN
    INSERT INTO subscription_price_history (subscription_id, user_id, old_amount, new_amount)
    VALUES (NEW.id, NEW.user_id, OLD.amount, NEW.amount);
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_subscription_price_change
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION log_subscription_price_change();

-- ─── USER GASTOS SETTINGS ──────────────

CREATE TABLE IF NOT EXISTS user_gastos_settings (
  user_id           UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  monthly_budget    NUMERIC(10,2),
  default_currency  TEXT DEFAULT 'EUR',
  show_annual_prices BOOLEAN DEFAULT FALSE,
  list_view_mode    TEXT DEFAULT 'category' CHECK (list_view_mode IN ('category', 'chronological')),
  collapsed_categories TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_gastos_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own gastos settings"
  ON user_gastos_settings FOR ALL
  USING (auth.uid() = user_id);

CREATE TRIGGER user_gastos_settings_updated_at
  BEFORE UPDATE ON user_gastos_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
