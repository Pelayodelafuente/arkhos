-- Fix generate_historical_snapshots: skip current month to avoid
-- conflicting with the daily TR sync which handles the current month
-- with actual live prices and real cash data.
--
-- Before: WHILE v_cur_month <= DATE_TRUNC('month', CURRENT_DATE)
-- After:  WHILE v_cur_month <  DATE_TRUNC('month', CURRENT_DATE)
--
-- This means "Cargar histórico" only populates completed past months.
-- The current month's snapshot is exclusively owned by the daily sync.

CREATE OR REPLACE FUNCTION generate_historical_snapshots(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_platform_tr    UUID;
  v_month          DATE;
  v_first_month    DATE;
  v_cur_month      DATE;
  v_total_value    NUMERIC;
  v_total_invested NUMERIC;
BEGIN

  SELECT id INTO v_platform_tr
  FROM investment_platforms
  WHERE user_id = p_user_id AND slug = 'trade-republic';

  IF v_platform_tr IS NULL THEN RETURN; END IF;

  SELECT DATE_TRUNC('month', MIN(transaction_date))::date
  INTO v_first_month
  FROM portfolio_transactions
  WHERE user_id = p_user_id AND asset_id IS NOT NULL;

  IF v_first_month IS NULL THEN RETURN; END IF;

  v_cur_month := v_first_month;

  -- Only process COMPLETED past months (< current month).
  -- Current month is handled by the daily TR sync with live data.
  WHILE v_cur_month < DATE_TRUNC('month', CURRENT_DATE) LOOP

    v_month := (DATE_TRUNC('month', v_cur_month) + INTERVAL '1 month - 1 day')::date;

    SELECT COALESCE(SUM(
      CASE
        WHEN type IN ('buy','savings_plan','saveback') THEN total_amount
        WHEN type = 'sell' THEN -total_amount
        ELSE 0
      END
    ), 0)
    INTO v_total_invested
    FROM portfolio_transactions
    WHERE user_id = p_user_id
      AND transaction_date <= v_month
      AND asset_id IS NOT NULL;

    SELECT COALESCE(SUM(
      CASE
        WHEN ph.price_eur IS NOT NULL AND pos.qty > 0.000001
          THEN pos.qty * ph.price_eur
        ELSE pos.cost_basis
      END
    ), 0)
    INTO v_total_value
    FROM (
      SELECT
        a.isin,
        SUM(CASE
          WHEN t.type IN ('buy','savings_plan','saveback') THEN t.quantity
          WHEN t.type = 'sell' THEN -t.quantity
          ELSE 0
        END) AS qty,
        SUM(CASE
          WHEN t.type IN ('buy','savings_plan','saveback') THEN t.total_amount
          WHEN t.type = 'sell' THEN -t.total_amount
          ELSE 0
        END) AS cost_basis
      FROM portfolio_transactions t
      JOIN portfolio_assets a ON a.id = t.asset_id
      WHERE t.user_id = p_user_id
        AND t.transaction_date <= v_month
        AND t.asset_id IS NOT NULL
      GROUP BY a.isin
      HAVING SUM(CASE
        WHEN t.type IN ('buy','savings_plan','saveback') THEN t.quantity
        WHEN t.type = 'sell' THEN -t.quantity
        ELSE 0
      END) > 0.000001
    ) pos
    LEFT JOIN LATERAL (
      SELECT price_eur
      FROM asset_price_history
      WHERE user_id = p_user_id
        AND isin = pos.isin
        AND price_date <= v_month
      ORDER BY price_date DESC
      LIMIT 1
    ) ph ON true;

    INSERT INTO portfolio_snapshots (
      user_id, snapshot_date, platform_id,
      total_value, total_invested, cash_value,
      pl_amount, pl_percentage
    ) VALUES (
      p_user_id,
      v_month,
      v_platform_tr,
      v_total_value,
      v_total_invested,
      0,
      v_total_value - v_total_invested,
      CASE WHEN v_total_invested > 0
        THEN ROUND(((v_total_value - v_total_invested) / v_total_invested * 100)::numeric, 4)
        ELSE 0
      END
    )
    ON CONFLICT (user_id, snapshot_date, platform_id) DO UPDATE SET
      total_value    = EXCLUDED.total_value,
      total_invested = EXCLUDED.total_invested,
      cash_value     = EXCLUDED.cash_value,
      pl_amount      = EXCLUDED.pl_amount,
      pl_percentage  = EXCLUDED.pl_percentage;

    v_cur_month := (DATE_TRUNC('month', v_cur_month) + INTERVAL '1 month')::date;

  END LOOP;

END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION generate_historical_snapshots(UUID) TO authenticated;
