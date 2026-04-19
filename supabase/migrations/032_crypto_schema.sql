-- ============================================================
-- 032_crypto_schema.sql
-- Módulo Crypto: assets, transactions, DeFi, price history, plan mensual
-- ============================================================

-- ------------------------------------------------------------
-- crypto_assets
-- ------------------------------------------------------------
CREATE TABLE crypto_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol              TEXT NOT NULL,
  name                TEXT NOT NULL,
  coingecko_id        TEXT,
  wallet_address      TEXT,
  wallet_type         TEXT,  -- 'trust_wallet' | 'metamask' | 'bit2me' | 'aave'
  network             TEXT DEFAULT 'mainnet',  -- 'bitcoin' | 'ethereum' | 'polygon'
  current_balance     NUMERIC(24, 10),
  avg_buy_price_eur   NUMERIC(14, 4),
  total_invested_eur  NUMERIC(14, 2),
  current_price_eur   NUMERIC(14, 4),
  price_updated_at    TIMESTAMPTZ,
  is_active           BOOLEAN DEFAULT true,
  notes               TEXT,
  color               TEXT,
  sort_order          INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, symbol)
);

ALTER TABLE crypto_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON crypto_assets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_crypto_assets_user_id ON crypto_assets(user_id);

-- ------------------------------------------------------------
-- crypto_transactions
-- ------------------------------------------------------------
CREATE TABLE crypto_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  asset_id         UUID REFERENCES crypto_assets(id) ON DELETE CASCADE,
  transaction_date TIMESTAMPTZ NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('buy','sell','transfer_in','transfer_out','staking_reward','defi_yield')),
  quantity         NUMERIC(24, 10),
  price_eur        NUMERIC(14, 4),
  amount_eur       NUMERIC(14, 2),
  fee_eur          NUMERIC(10, 4),
  exchange         TEXT,
  tx_hash          TEXT,
  notes            TEXT,
  source           TEXT DEFAULT 'manual',  -- 'import_bit2me' | 'manual' | 'blockchain'
  external_id      TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crypto_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON crypto_transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_crypto_transactions_user_date ON crypto_transactions(user_id, transaction_date DESC);
CREATE INDEX idx_crypto_transactions_asset_id  ON crypto_transactions(asset_id);

-- ------------------------------------------------------------
-- crypto_defi_positions
-- ------------------------------------------------------------
CREATE TABLE crypto_defi_positions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  asset_id         UUID REFERENCES crypto_assets(id) ON DELETE CASCADE,
  protocol         TEXT NOT NULL,  -- 'aave'
  network          TEXT NOT NULL,
  wallet_address   TEXT NOT NULL,
  deposited_amount NUMERIC(24, 10),
  current_amount   NUMERIC(24, 10),
  apy              NUMERIC(8, 4),
  yield_earned     NUMERIC(24, 10),
  last_updated     TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crypto_defi_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON crypto_defi_positions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------
-- crypto_price_history
-- ------------------------------------------------------------
CREATE TABLE crypto_price_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol     TEXT NOT NULL,
  price_date DATE NOT NULL,
  price_eur  NUMERIC(14, 4),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, symbol, price_date)
);

ALTER TABLE crypto_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON crypto_price_history
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_crypto_price_history_user_symbol_date ON crypto_price_history(user_id, symbol, price_date DESC);

-- ------------------------------------------------------------
-- crypto_monthly_plan
-- ------------------------------------------------------------
CREATE TABLE crypto_monthly_plan (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  asset_id           UUID REFERENCES crypto_assets(id) ON DELETE CASCADE,
  monthly_amount_eur NUMERIC(10, 2),
  destination        TEXT,  -- 'trust_wallet' | 'metamask' | 'aave'
  is_active          BOOLEAN DEFAULT true,
  started_at         DATE,
  notes              TEXT
);

ALTER TABLE crypto_monthly_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only" ON crypto_monthly_plan
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
