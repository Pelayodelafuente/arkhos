-- =============================================================================
-- 046_optimize_rls.sql
-- Optimiza policies RLS: auth.uid() → (SELECT auth.uid())
-- Esto evita evaluar auth.uid() una vez por fila y lo evalúa una sola vez
-- por query completa. Mejora de hasta 100x en tablas con muchas filas.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users access own profile" ON profiles;
CREATE POLICY "Users access own profile" ON profiles
  FOR ALL
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- activity_log
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users access own activity" ON activity_log;
CREATE POLICY "Users access own activity" ON activity_log
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users access own projects" ON projects;
CREATE POLICY "Users access own projects" ON projects
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- expense_categories — consolidar 4 policies → 1 FOR ALL
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users select own expense_categories" ON expense_categories;
DROP POLICY IF EXISTS "Users insert own expense_categories" ON expense_categories;
DROP POLICY IF EXISTS "Users update own expense_categories" ON expense_categories;
DROP POLICY IF EXISTS "Users delete own expense_categories" ON expense_categories;
CREATE POLICY "owner_all_expense_categories" ON expense_categories
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- subscriptions — consolidar 4 policies → 1 FOR ALL
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users select own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users insert own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users update own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users delete own subscriptions" ON subscriptions;
CREATE POLICY "owner_all_subscriptions" ON subscriptions
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- subscription_price_history — consolidar 2 policies → 1 FOR ALL
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users select own price history" ON subscription_price_history;
DROP POLICY IF EXISTS "Users insert own price history" ON subscription_price_history;
CREATE POLICY "owner_all_price_history" ON subscription_price_history
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "notes_user_policy" ON notes;
CREATE POLICY "notes_user_policy" ON notes
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- note_canvases
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "canvases_user_policy" ON note_canvases;
CREATE POLICY "canvases_user_policy" ON note_canvases
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- Patrimonio — Trade Republic
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "owner_all_platforms" ON investment_platforms;
CREATE POLICY "owner_all_platforms" ON investment_platforms
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_all_assets" ON portfolio_assets;
CREATE POLICY "owner_all_assets" ON portfolio_assets
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_all_transactions" ON portfolio_transactions;
CREATE POLICY "owner_all_transactions" ON portfolio_transactions
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_all_plan" ON savings_plan_items;
CREATE POLICY "owner_all_plan" ON savings_plan_items
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_all_snapshots" ON portfolio_snapshots;
CREATE POLICY "owner_all_snapshots" ON portfolio_snapshots
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_all_income" ON passive_income;
CREATE POLICY "owner_all_income" ON passive_income
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- Indexa
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "indexa_funds_owner" ON indexa_funds;
CREATE POLICY "indexa_funds_owner" ON indexa_funds
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "indexa_positions_owner" ON indexa_positions;
CREATE POLICY "indexa_positions_owner" ON indexa_positions
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "indexa_transactions_owner" ON indexa_transactions;
CREATE POLICY "indexa_transactions_owner" ON indexa_transactions
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "indexa_monthly_returns_owner" ON indexa_monthly_returns;
CREATE POLICY "indexa_monthly_returns_owner" ON indexa_monthly_returns
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "indexa_monthly_plan_owner" ON indexa_monthly_plan;
CREATE POLICY "indexa_monthly_plan_owner" ON indexa_monthly_plan
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- Horos
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "horos_position_owner" ON horos_position;
CREATE POLICY "horos_position_owner" ON horos_position
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "horos_transactions_owner" ON horos_transactions;
CREATE POLICY "horos_transactions_owner" ON horos_transactions
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "horos_nav_history_owner" ON horos_nav_history;
CREATE POLICY "horos_nav_history_owner" ON horos_nav_history
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "horos_fund_distribution_owner" ON horos_fund_distribution;
CREATE POLICY "horos_fund_distribution_owner" ON horos_fund_distribution
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "horos_annual_costs_owner" ON horos_annual_costs;
CREATE POLICY "horos_annual_costs_owner" ON horos_annual_costs
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "horos_monthly_plan_owner" ON horos_monthly_plan;
CREATE POLICY "horos_monthly_plan_owner" ON horos_monthly_plan
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- Crypto
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "owner_only" ON crypto_assets;
CREATE POLICY "owner_only" ON crypto_assets
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_only" ON crypto_transactions;
CREATE POLICY "owner_only" ON crypto_transactions
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_only" ON crypto_defi_positions;
CREATE POLICY "owner_only" ON crypto_defi_positions
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_only" ON crypto_price_history;
CREATE POLICY "owner_only" ON crypto_price_history
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_only" ON crypto_monthly_plan;
CREATE POLICY "owner_only" ON crypto_monthly_plan
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- Mintos
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "owner_only" ON mintos_overview;
CREATE POLICY "owner_only" ON mintos_overview
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_only" ON mintos_deposits;
CREATE POLICY "owner_only" ON mintos_deposits
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_only" ON mintos_monthly_snapshots;
CREATE POLICY "owner_only" ON mintos_monthly_snapshots
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_only" ON mintos_portfolio_health;
CREATE POLICY "owner_only" ON mintos_portfolio_health
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_only" ON mintos_distributions;
CREATE POLICY "owner_only" ON mintos_distributions
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_only" ON mintos_plan;
CREATE POLICY "owner_only" ON mintos_plan
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- asset_price_history
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "asset_price_history_owner" ON asset_price_history;
CREATE POLICY "asset_price_history_owner" ON asset_price_history
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- gastos_settings
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own gastos settings" ON gastos_settings;
CREATE POLICY "Users manage own gastos settings" ON gastos_settings
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
