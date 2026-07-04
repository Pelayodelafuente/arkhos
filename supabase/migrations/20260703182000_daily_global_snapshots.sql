-- ============================================================
-- 20260703: snapshots diarios GLOBALES de Patrimonio
--
-- Fila global (platform_id NULL) en portfolio_snapshots con el valor
-- total de TODAS las plataformas (portfolio_assets activos), calculada:
--  · a diario desde el cron (run_daily_global_snapshots, service role)
--  · tras cada mutación de Patrimonio (junto a upsert_today_snapshot)
-- El P&L% excluye el cash del denominador (misma regla que el overview).
-- ============================================================

-- Índice único parcial: una sola fila global por usuario y día
-- (el UNIQUE(user_id, snapshot_date, platform_id) no cubre NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_snapshots_global_unique
  ON portfolio_snapshots(user_id, snapshot_date)
  WHERE platform_id IS NULL;

CREATE OR REPLACE FUNCTION upsert_daily_global_snapshot(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_assets_value       NUMERIC;
  v_cash_value         NUMERIC;
  v_total_value        NUMERIC;
  v_total_invested     NUMERIC;
  v_non_cash_invested  NUMERIC;
  v_pl                 NUMERIC;
  v_pl_pct             NUMERIC;
BEGIN
  -- Solo el propio usuario (cliente autenticado) o service role (auth.uid() NULL)
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN category <> 'cash'
      THEN current_quantity * COALESCE(current_price_eur, current_price, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'cash'
      THEN current_quantity * COALESCE(current_price_eur, current_price, 1) ELSE 0 END), 0),
    COALESCE(SUM(total_invested), 0),
    COALESCE(SUM(CASE WHEN category <> 'cash' THEN total_invested ELSE 0 END), 0)
  INTO v_assets_value, v_cash_value, v_total_invested, v_non_cash_invested
  FROM portfolio_assets
  WHERE user_id = p_user_id AND is_active = true;

  v_total_value := v_assets_value + v_cash_value;

  -- Sin activos no hay nada que registrar
  IF v_total_value = 0 AND v_total_invested = 0 THEN RETURN; END IF;

  v_pl     := v_total_value - v_total_invested;
  v_pl_pct := CASE WHEN v_non_cash_invested > 0
              THEN ROUND((v_pl / v_non_cash_invested * 100)::numeric, 4)
              ELSE 0 END;

  INSERT INTO portfolio_snapshots (
    user_id, snapshot_date, platform_id,
    total_value, total_invested, cash_value, pl_amount, pl_percentage
  ) VALUES (
    p_user_id, CURRENT_DATE, NULL,
    v_total_value, v_total_invested, v_cash_value, v_pl, v_pl_pct
  )
  ON CONFLICT (user_id, snapshot_date) WHERE platform_id IS NULL DO UPDATE SET
    total_value    = EXCLUDED.total_value,
    total_invested = EXCLUDED.total_invested,
    cash_value     = EXCLUDED.cash_value,
    pl_amount      = EXCLUDED.pl_amount,
    pl_percentage  = EXCLUDED.pl_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Wrapper para el cron: itera todos los usuarios con activos.
-- Solo service role (auth.uid() NULL); bloqueado para clientes.
CREATE OR REPLACE FUNCTION run_daily_global_snapshots()
RETURNS integer AS $$
DECLARE
  u RECORD;
  n integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Solo service role';
  END IF;
  FOR u IN SELECT DISTINCT user_id FROM portfolio_assets WHERE is_active = true LOOP
    PERFORM upsert_daily_global_snapshot(u.user_id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION run_daily_global_snapshots() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION upsert_daily_global_snapshot(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION upsert_daily_global_snapshot(UUID) TO authenticated;
