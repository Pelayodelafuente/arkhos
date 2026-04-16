-- ============================================================
-- FIX: generate_historical_snapshots
-- Corrige la función de generación de snapshots históricos
-- para eliminar artefactos de rentabilidad imposible (>500%)
-- provocados por el enfoque de revaluación por último-precio.
--
-- Problema original:
--   total_value = SUM(qty × last_purchase_price)
--   Esto revalúa TODAS las participaciones al último precio de compra,
--   generando variaciones de valor artificiales entre meses (ej. +38%
--   en un mes sólo porque se compró más a un precio distinto).
--
-- Solución:
--   total_value = total_invested (base de coste)
--   Así el historial de snapshots muestra sólo el capital desplegado
--   (sin P&L artificial). El P&L real se muestra en el punto live.
--
-- Para regenerar snapshots tras aplicar esta migración:
--   SELECT generate_historical_snapshots('<user_id>');
-- ============================================================

CREATE OR REPLACE FUNCTION generate_historical_snapshots(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_platform_tr UUID;
  v_month DATE;
  v_months DATE[] := ARRAY[
    '2024-11-30'::date,'2024-12-31'::date,
    '2025-01-31'::date,'2025-02-28'::date,'2025-03-31'::date,
    '2025-04-30'::date,'2025-05-31'::date,'2025-06-30'::date,
    '2025-07-31'::date,'2025-08-31'::date,'2025-09-30'::date,
    '2025-10-31'::date,'2025-11-30'::date,'2025-12-31'::date,
    '2026-01-31'::date,'2026-02-28'::date,'2026-03-31'::date,
    '2026-04-10'::date
  ];
  v_total_invested NUMERIC;
BEGIN

SELECT id INTO v_platform_tr
FROM investment_platforms WHERE user_id = p_user_id AND slug = 'trade-republic';

DELETE FROM portfolio_snapshots WHERE user_id = p_user_id;

FOREACH v_month IN ARRAY v_months LOOP

  -- Capital acumulado hasta este mes (todas las compras del plan + directas)
  SELECT
    COALESCE(SUM(
      CASE WHEN type IN ('buy','savings_plan','saveback') THEN total_amount
           WHEN type = 'sell' THEN -total_amount
           ELSE 0
      END
    ), 0)
  INTO v_total_invested
  FROM portfolio_transactions
  WHERE user_id = p_user_id
    AND transaction_date <= v_month
    AND asset_id IS NOT NULL;

  -- total_value = total_invested (base de coste).
  -- Sin precio de mercado histórico no podemos calcular valor real;
  -- usar el precio de la última compra revaluaría todas las participaciones
  -- creando rentabilidades artificiales de hasta +500%.
  -- El P&L real se muestra en el punto "hoy" calculado con precios live.
  INSERT INTO portfolio_snapshots (
    user_id, snapshot_date, platform_id,
    total_value, total_invested, cash_value,
    pl_amount, pl_percentage
  ) VALUES (
    p_user_id, v_month, v_platform_tr,
    v_total_invested,   -- value = invested (cost basis, no fake P&L)
    v_total_invested,
    0,                  -- cash tracked separately
    0,                  -- no P&L on historical snapshots
    0
  )
  ON CONFLICT (user_id, snapshot_date, platform_id) DO UPDATE SET
    total_value      = EXCLUDED.total_value,
    total_invested   = EXCLUDED.total_invested,
    cash_value       = EXCLUDED.cash_value,
    pl_amount        = EXCLUDED.pl_amount,
    pl_percentage    = EXCLUDED.pl_percentage;

END LOOP;

END;
$$ LANGUAGE plpgsql;
