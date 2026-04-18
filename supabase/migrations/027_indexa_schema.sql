-- ============================================================
-- SCHEMA: Módulo Indexa Capital
-- Tablas: indexa_funds, indexa_positions, indexa_transactions,
--         indexa_monthly_returns, indexa_monthly_plan
-- ============================================================

-- -----------------------------------------------------------
-- 1. indexa_funds
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS indexa_funds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  isin         TEXT NOT NULL,
  fund_type    TEXT NOT NULL CHECK (fund_type IN ('equity', 'bond', 'cash')),
  benchmark    TEXT,
  annual_cost  NUMERIC(5, 4),
  currency     TEXT NOT NULL DEFAULT 'EUR',
  color        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE indexa_funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "indexa_funds_owner" ON indexa_funds
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_indexa_funds_user ON indexa_funds(user_id);

-- -----------------------------------------------------------
-- 2. indexa_positions
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS indexa_positions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fund_id          UUID REFERENCES indexa_funds(id) ON DELETE SET NULL,
  fund_type        TEXT CHECK (fund_type IN ('equity', 'bond', 'cash')),
  shares           NUMERIC(12, 6),
  price_per_share  NUMERIC(12, 4),
  total_value      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_cost       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unrealized_gain  NUMERIC(12, 2) GENERATED ALWAYS AS (total_value - total_cost) STORED,
  allocation_pct   NUMERIC(5, 2),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE indexa_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "indexa_positions_owner" ON indexa_positions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_indexa_positions_user ON indexa_positions(user_id);
CREATE INDEX idx_indexa_positions_fund ON indexa_positions(fund_id);

-- -----------------------------------------------------------
-- 3. indexa_transactions
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS indexa_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fund_id          UUID REFERENCES indexa_funds(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  value_date       DATE,
  type             TEXT NOT NULL CHECK (type IN ('subscription', 'redemption', 'transfer_in', 'transfer_out')),
  shares           NUMERIC(12, 6),
  price_per_share  NUMERIC(12, 4),
  amount           NUMERIC(12, 2) NOT NULL,
  retention        NUMERIC(10, 4) NOT NULL DEFAULT 0,
  fiscal_result    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes            TEXT,
  source           TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import_csv')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE indexa_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "indexa_transactions_owner" ON indexa_transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_indexa_tx_user ON indexa_transactions(user_id);
CREATE INDEX idx_indexa_tx_date ON indexa_transactions(user_id, transaction_date DESC);
CREATE INDEX idx_indexa_tx_fund ON indexa_transactions(fund_id);

-- -----------------------------------------------------------
-- 4. indexa_monthly_returns
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS indexa_monthly_returns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year            INTEGER NOT NULL,
  month           INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  return_pct      NUMERIC(8, 4),
  benchmark_pct   NUMERIC(8, 4),
  cumulative_twr  NUMERIC(8, 4),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, month)
);

ALTER TABLE indexa_monthly_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "indexa_monthly_returns_owner" ON indexa_monthly_returns
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_indexa_returns_user ON indexa_monthly_returns(user_id, year, month);

-- -----------------------------------------------------------
-- 5. indexa_monthly_plan
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS indexa_monthly_plan (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  monthly_amount  NUMERIC(10, 2) NOT NULL,
  execution_day   INTEGER NOT NULL DEFAULT 5 CHECK (execution_day BETWEEN 1 AND 31),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  started_at      DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE indexa_monthly_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "indexa_monthly_plan_owner" ON indexa_monthly_plan
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_indexa_plan_user ON indexa_monthly_plan(user_id);
