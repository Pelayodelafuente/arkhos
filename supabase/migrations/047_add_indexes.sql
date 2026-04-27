-- =============================================================================
-- 047_add_indexes.sql
-- Añade índices faltantes en columnas de alta frecuencia de filtrado/ordenación.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- portfolio_transactions (puede tener miles de filas)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_user_date
  ON portfolio_transactions(user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_asset_date
  ON portfolio_transactions(asset_id, transaction_date DESC);

-- ---------------------------------------------------------------------------
-- portfolio_assets
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_user_platform
  ON portfolio_assets(user_id, platform_id);

-- ---------------------------------------------------------------------------
-- portfolio_snapshots
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date
  ON portfolio_snapshots(user_id, snapshot_date DESC);

-- ---------------------------------------------------------------------------
-- passive_income
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_passive_income_user_date
  ON passive_income(user_id, income_date DESC);

-- ---------------------------------------------------------------------------
-- crypto_transactions
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_user_date
  ON crypto_transactions(user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_crypto_transactions_asset
  ON crypto_transactions(asset_id, transaction_date DESC);

-- ---------------------------------------------------------------------------
-- mintos_deposits (tabla principal de movimientos Mintos)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_mintos_deposits_user_date
  ON mintos_deposits(user_id, deposit_date DESC);

-- ---------------------------------------------------------------------------
-- horos_transactions
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_horos_transactions_user_date
  ON horos_transactions(user_id, request_date DESC);

-- ---------------------------------------------------------------------------
-- indexa_transactions
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_indexa_transactions_user_date
  ON indexa_transactions(user_id, transaction_date DESC);

-- ---------------------------------------------------------------------------
-- notes (búsquedas frecuentes por usuario ordenadas por updated_at)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notes_user_updated
  ON notes(user_id, updated_at DESC);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_projects_user_status
  ON projects(user_id, status);

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON subscriptions(user_id, status);
