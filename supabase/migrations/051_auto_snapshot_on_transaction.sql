-- ============================================================
-- 051: upsert_today_snapshot
--
-- Función que regenera el snapshot del día actual para TR
-- usando los valores reales de portfolio_transactions (invested)
-- y portfolio_assets × precio actual (value).
--
-- Se llama automáticamente desde recalcAssets en patrimonio.ts
-- cada vez que se añaden/modifican/eliminan transacciones o
-- se actualizan precios.
-- ============================================================

CREATE OR REPLACE FUNCTION upsert_today_snapshot(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_platform_tr UUID;
  v_total_invested NUMERIC;
  v_total_value    NUMERIC;
  v_cash_value     NUMERIC;
  v_pl             NUMERIC;
  v_pl_pct         NUMERIC;
BEGIN
  SELECT id INTO v_platform_tr
  FROM investment_platforms
  WHERE user_id = p_user_id AND slug = 'trade-republic';

  IF v_platform_tr IS NULL THEN RETURN; END IF;

  -- Capital invertido: suma canónica desde transacciones (excluye cash)
  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('buy','savings_plan','saveback') THEN total_amount
      WHEN type = 'sell'                             THEN -total_amount
      ELSE 0
    END
  ), 0)
  INTO v_total_invested
  FROM portfolio_transactions
  WHERE user_id   = p_user_id
    AND asset_id IS NOT NULL;

  -- Valor de mercado actual de activos no-cash (qty × precio)
  SELECT COALESCE(SUM(
    current_quantity * COALESCE(current_price_eur, current_price, 0)
  ), 0)
  INTO v_total_value
  FROM portfolio_assets
  WHERE user_id    = p_user_id
    AND platform_id = v_platform_tr
    AND category   != 'cash'
    AND is_active   = true;

  -- Efectivo actual
  SELECT COALESCE(SUM(
    current_quantity * COALESCE(current_price_eur, current_price, 1)
  ), 0)
  INTO v_cash_value
  FROM portfolio_assets
  WHERE user_id    = p_user_id
    AND platform_id = v_platform_tr
    AND category    = 'cash'
    AND is_active   = true;

  v_pl     := v_total_value - v_total_invested;
  v_pl_pct := CASE WHEN v_total_invested > 0
              THEN ROUND((v_pl / v_total_invested * 100)::numeric, 4)
              ELSE 0 END;

  INSERT INTO portfolio_snapshots (
    user_id, snapshot_date, platform_id,
    total_value, total_invested, cash_value,
    pl_amount, pl_percentage
  ) VALUES (
    p_user_id, CURRENT_DATE, v_platform_tr,
    v_total_value, v_total_invested, v_cash_value,
    v_pl, v_pl_pct
  )
  ON CONFLICT (user_id, snapshot_date, platform_id) DO UPDATE SET
    total_value    = EXCLUDED.total_value,
    total_invested = EXCLUDED.total_invested,
    cash_value     = EXCLUDED.cash_value,
    pl_amount      = EXCLUDED.pl_amount,
    pl_percentage  = EXCLUDED.pl_percentage;
END;
$$ LANGUAGE plpgsql;
