-- ============================================================
-- MÓDULO PATRIMONIO — Schema completo
-- Migration: 022_patrimonio_schema.sql
-- ============================================================

-- PLATAFORMAS DE INVERSIÓN
CREATE TABLE IF NOT EXISTS investment_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL, -- 'trade-republic', 'crypto', 'indexa', 'horos', 'mintos'
  color TEXT NOT NULL DEFAULT '#2E7D6B',
  icon TEXT NOT NULL DEFAULT 'chart',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, slug)
);

-- TIPOS DE ACTIVO
DO $$ BEGIN
  CREATE TYPE asset_category AS ENUM (
    'etf_index',
    'etf_thematic',
    'etf_bond',
    'etf_commodity',
    'stock_us',
    'stock_eu',
    'stock_asia',
    'fund',
    'crypto',
    'p2p',
    'cash'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('very_low', 'low', 'medium', 'high', 'very_high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ACTIVOS
CREATE TABLE IF NOT EXISTS portfolio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES investment_platforms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ticker TEXT,
  isin TEXT,
  category asset_category NOT NULL,
  risk_level risk_level DEFAULT 'medium',
  sector TEXT,
  geographic_region TEXT,
  currency TEXT DEFAULT 'EUR',
  current_quantity NUMERIC(20, 8) DEFAULT 0,
  avg_buy_price NUMERIC(15, 6) DEFAULT 0,
  total_invested NUMERIC(15, 2) DEFAULT 0,
  current_price NUMERIC(15, 6),
  current_price_eur NUMERIC(15, 6),
  price_updated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TRANSACCIONES
DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM (
    'buy',
    'sell',
    'savings_plan',
    'saveback',
    'dividend',
    'transfer_in',
    'transfer_out'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES portfolio_assets(id) ON DELETE SET NULL,
  platform_id UUID NOT NULL REFERENCES investment_platforms(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  transaction_date DATE NOT NULL,
  quantity NUMERIC(20, 8),
  price_per_unit NUMERIC(15, 6),
  total_amount NUMERIC(15, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  notes TEXT,
  source TEXT DEFAULT 'manual',
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PLAN DE AHORRO ACTIVO
CREATE TABLE IF NOT EXISTS savings_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES portfolio_assets(id) ON DELETE CASCADE,
  monthly_amount NUMERIC(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  execution_day INTEGER DEFAULT 2,
  started_at DATE,
  ended_at DATE,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SNAPSHOTS DIARIOS DEL PORTFOLIO
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  platform_id UUID REFERENCES investment_platforms(id),
  total_value NUMERIC(15, 2) NOT NULL,
  total_invested NUMERIC(15, 2) NOT NULL,
  cash_value NUMERIC(15, 2) DEFAULT 0,
  pl_amount NUMERIC(15, 2),
  pl_percentage NUMERIC(8, 4),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, snapshot_date, platform_id)
);

-- INGRESOS PASIVOS
DO $$ BEGIN
  CREATE TYPE passive_income_type AS ENUM ('dividend', 'interest', 'saveback', 'coupon', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS passive_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES portfolio_assets(id) ON DELETE SET NULL,
  platform_id UUID NOT NULL REFERENCES investment_platforms(id) ON DELETE CASCADE,
  type passive_income_type NOT NULL,
  income_date DATE NOT NULL,
  amount NUMERIC(10, 4) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_user ON portfolio_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_platform ON portfolio_assets(platform_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_user ON portfolio_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_asset ON portfolio_transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_date ON portfolio_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date ON portfolio_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_passive_income_user ON passive_income(user_id);

-- RLS
ALTER TABLE investment_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE passive_income ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS
DO $$ BEGIN
  CREATE POLICY "owner_all_platforms" ON investment_platforms FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner_all_assets" ON portfolio_assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner_all_transactions" ON portfolio_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner_all_plan" ON savings_plan_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner_all_snapshots" ON portfolio_snapshots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner_all_income" ON passive_income FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- TRIGGER updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ language 'plpgsql';

DO $$ BEGIN
  CREATE TRIGGER update_portfolio_assets_updated_at
    BEFORE UPDATE ON portfolio_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_savings_plan_updated_at
    BEFORE UPDATE ON savings_plan_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
