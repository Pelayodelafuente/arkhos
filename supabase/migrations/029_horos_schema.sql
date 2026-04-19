-- ============================================================
-- SCHEMA: Módulo Horos Asset Management
-- Tablas: horos_position, horos_transactions, horos_nav_history,
--         horos_fund_distribution, horos_annual_costs, horos_monthly_plan
-- ============================================================

-- -----------------------------------------------------------
-- 1. horos_position
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS horos_position (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fund_name           TEXT NOT NULL DEFAULT 'Horos Value Internacional, FI',
  isin                TEXT NOT NULL DEFAULT 'ES0146309002',
  account_code        TEXT DEFAULT '841372',
  shares              NUMERIC(14, 6) NOT NULL,
  nav_price           NUMERIC(12, 6) NOT NULL,
  nav_date            DATE NOT NULL,
  total_value         NUMERIC(12, 2) NOT NULL,
  total_cost          NUMERIC(12, 2) NOT NULL,
  unrealized_gain     NUMERIC(12, 2) GENERATED ALWAYS AS (total_value - total_cost) STORED,
  unrealized_gain_pct NUMERIC(8, 4) GENERATED ALWAYS AS (
    CASE WHEN total_cost > 0 THEN ((total_value - total_cost) / total_cost) * 100 ELSE 0 END
  ) STORED,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE horos_position ENABLE ROW LEVEL SECURITY;

CREATE POLICY "horos_position_owner" ON horos_position
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_horos_position_user ON horos_position(user_id);

-- -----------------------------------------------------------
-- 2. horos_transactions
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS horos_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_date DATE NOT NULL,
  value_date   DATE NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('subscription', 'redemption')),
  nav_applied  NUMERIC(12, 6) NOT NULL,
  shares       NUMERIC(14, 6) NOT NULL,
  amount       NUMERIC(12, 2) NOT NULL,
  commission   NUMERIC(10, 4) NOT NULL DEFAULT 0,
  notes        TEXT,
  source       TEXT NOT NULL DEFAULT 'manual',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE horos_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "horos_transactions_owner" ON horos_transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_horos_tx_user ON horos_transactions(user_id);
CREATE INDEX idx_horos_tx_date ON horos_transactions(user_id, value_date DESC);

-- -----------------------------------------------------------
-- 3. horos_nav_history
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS horos_nav_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nav_date        DATE NOT NULL,
  nav_price       NUMERIC(12, 6) NOT NULL,
  portfolio_value NUMERIC(12, 2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, nav_date)
);

ALTER TABLE horos_nav_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "horos_nav_history_owner" ON horos_nav_history
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_horos_nav_user ON horos_nav_history(user_id, nav_date DESC);

-- -----------------------------------------------------------
-- 4. horos_fund_distribution
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS horos_fund_distribution (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  dimension   TEXT NOT NULL CHECK (dimension IN ('sector', 'geography')),
  category    TEXT NOT NULL,
  percentage  NUMERIC(6, 2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE horos_fund_distribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "horos_fund_distribution_owner" ON horos_fund_distribution
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_horos_dist_user ON horos_fund_distribution(user_id, dimension);

-- -----------------------------------------------------------
-- 5. horos_annual_costs
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS horos_annual_costs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year            INTEGER NOT NULL,
  management_fee  NUMERIC(10, 2),
  custody_fee     NUMERIC(10, 2),
  other_fees      NUMERIC(10, 2),
  operation_costs NUMERIC(10, 2),
  total_costs     NUMERIC(10, 2),
  total_pct       NUMERIC(6, 4),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

ALTER TABLE horos_annual_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "horos_annual_costs_owner" ON horos_annual_costs
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_horos_costs_user ON horos_annual_costs(user_id, year DESC);

-- -----------------------------------------------------------
-- 6. horos_monthly_plan
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS horos_monthly_plan (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  monthly_amount NUMERIC(10, 2) NOT NULL DEFAULT 100,
  execution_day  INTEGER NOT NULL DEFAULT 1 CHECK (execution_day BETWEEN 1 AND 31),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  started_at     DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE horos_monthly_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "horos_monthly_plan_owner" ON horos_monthly_plan
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_horos_plan_user ON horos_monthly_plan(user_id);
