-- Migration 040: Mintos P2P Lending module
-- Tables: mintos_overview, mintos_deposits, mintos_monthly_snapshots,
--         mintos_portfolio_health, mintos_distributions, mintos_plan

-- ── 1. mintos_overview: snapshot actual ─────────────────────────────────────
CREATE TABLE mintos_overview (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_value         numeric(12,4) NOT NULL DEFAULT 0,
  invested_in_loans   numeric(12,4) NOT NULL DEFAULT 0,
  cash_balance        numeric(12,4) NOT NULL DEFAULT 0,
  pending_payments    numeric(12,4) NOT NULL DEFAULT 0,
  net_gain            numeric(12,4) NOT NULL DEFAULT 0,
  xirr                numeric(8,4)  NULL,        -- % anual (ej: 8.6)
  avg_interest_rate   numeric(8,4)  NULL,        -- % ponderado (ej: 9.18)
  active_loans_count  integer       NOT NULL DEFAULT 0,
  originators_count   integer       NOT NULL DEFAULT 0,
  countries_count     integer       NOT NULL DEFAULT 0,
  snapshot_date       date          NOT NULL DEFAULT CURRENT_DATE,
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE mintos_overview ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_only" ON mintos_overview FOR ALL USING (auth.uid() = user_id);

-- ── 2. mintos_deposits: historial de depósitos ───────────────────────────────
CREATE TABLE mintos_deposits (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deposit_date date        NOT NULL,
  amount       numeric(12,4) NOT NULL,
  notes        text        NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mintos_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_only" ON mintos_deposits FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_mintos_deposits_user_date ON mintos_deposits(user_id, deposit_date);

-- ── 3. mintos_monthly_snapshots: agregados mensuales del extracto ────────────
CREATE TABLE mintos_monthly_snapshots (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year             integer     NOT NULL,
  month            integer     NOT NULL CHECK (month BETWEEN 1 AND 12),
  -- Valor estimado de la cartera al cierre del mes
  total_value      numeric(12,4) NULL,
  -- Capital acumulado depositado hasta fin de mes
  total_deposited  numeric(12,4) NOT NULL DEFAULT 0,
  -- Flujos del mes (del extracto Excel)
  deposits         numeric(12,4) NOT NULL DEFAULT 0,
  interest_income  numeric(12,4) NOT NULL DEFAULT 0,
  capital_received numeric(12,4) NOT NULL DEFAULT 0,
  buyback_principal numeric(12,4) NOT NULL DEFAULT 0,
  buyback_interest  numeric(12,4) NOT NULL DEFAULT 0,
  investments      numeric(12,4) NOT NULL DEFAULT 0,
  secondary_market numeric(12,4) NOT NULL DEFAULT 0,
  late_interest    numeric(12,4) NOT NULL DEFAULT 0,
  commissions      numeric(12,4) NOT NULL DEFAULT 0,  -- valor absoluto (positivo)
  taxes_withheld   numeric(12,4) NOT NULL DEFAULT 0,  -- valor absoluto (positivo)
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, month)
);

ALTER TABLE mintos_monthly_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_only" ON mintos_monthly_snapshots FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_mintos_monthly_user_yearmonth ON mintos_monthly_snapshots(user_id, year, month);

-- ── 4. mintos_portfolio_health: semáforo de mora ────────────────────────────
CREATE TABLE mintos_portfolio_health (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  on_track_amount     numeric(12,4) NOT NULL DEFAULT 0,
  grace_period_amount numeric(12,4) NOT NULL DEFAULT 0,
  late_1_15_amount    numeric(12,4) NOT NULL DEFAULT 0,
  late_16_30_amount   numeric(12,4) NOT NULL DEFAULT 0,
  late_31_60_amount   numeric(12,4) NOT NULL DEFAULT 0,
  default_amount      numeric(12,4) NOT NULL DEFAULT 0,
  on_track_count      integer       NOT NULL DEFAULT 0,
  grace_period_count  integer       NOT NULL DEFAULT 0,
  late_1_15_count     integer       NOT NULL DEFAULT 0,
  late_16_30_count    integer       NOT NULL DEFAULT 0,
  late_31_60_count    integer       NOT NULL DEFAULT 0,
  default_count       integer       NOT NULL DEFAULT 0,
  snapshot_date       date          NOT NULL DEFAULT CURRENT_DATE,
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE mintos_portfolio_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_only" ON mintos_portfolio_health FOR ALL USING (auth.uid() = user_id);

-- ── 5. mintos_distributions: distribuciones flexibles ───────────────────────
-- dimension: 'loan_type' | 'term' | 'rate' | 'geography' | 'originator'
CREATE TABLE mintos_distributions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dimension     text        NOT NULL,
  category      text        NOT NULL,
  amount        numeric(12,4) NOT NULL DEFAULT 0,
  percentage    numeric(6,2) NULL,
  loan_count    integer     NULL,
  display_order integer     NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, dimension, category)
);

ALTER TABLE mintos_distributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_only" ON mintos_distributions FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_mintos_distributions_user_dim ON mintos_distributions(user_id, dimension);

-- ── 6. mintos_plan: plan de aportaciones mensuales ──────────────────────────
CREATE TABLE mintos_plan (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_amount numeric(12,4) NOT NULL DEFAULT 50,
  execution_day  integer     NOT NULL DEFAULT 3,
  is_active      boolean     NOT NULL DEFAULT true,
  next_date      date        NULL,
  notes          text        NULL,
  started_at     date        NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE mintos_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_only" ON mintos_plan FOR ALL USING (auth.uid() = user_id);
