-- ============================================================
-- Migration 026: asset_price_history + generate_historical_snapshots v2
--
-- Añade tabla de precios históricos mensuales por activo (EUR).
-- Actualiza generate_historical_snapshots() para calcular
-- total_value = SUM(qty × precio_histórico_EUR) en lugar de
-- total_value = total_invested (base de coste).
--
-- Con precios reales: TWR, CAGR, volatilidad y Sharpe son correctos.
-- Sin precio para un activo en un mes: fallback a base de coste.
--
-- Para cargar precios: POST /api/patrimonio/prices/historical
-- Para regenerar snapshots: SELECT generate_historical_snapshots('<user_id>');
-- ============================================================

-- -------------------------------------------------------
-- 1. Tabla asset_price_history
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS asset_price_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  isin        TEXT        NOT NULL,
  price_date  DATE        NOT NULL,
  price_eur   NUMERIC(15,6) NOT NULL,
  source      TEXT        NOT NULL DEFAULT 'yahoo',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT asset_price_history_unique UNIQUE (user_id, isin, price_date)
);

CREATE INDEX IF NOT EXISTS asset_price_history_lookup
  ON asset_price_history (user_id, isin, price_date DESC);

ALTER TABLE asset_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_price_history_owner"
  ON asset_price_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- 2. generate_historical_snapshots v2
--    value = SUM(qty × precio_hist) con fallback a coste
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_historical_snapshots(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_platform_tr   UUID;
  v_month         DATE;
  v_first_month   DATE;
  v_cur_month     DATE;
  v_total_value   NUMERIC;
  v_total_invested NUMERIC;
BEGIN

  SELECT id INTO v_platform_tr
  FROM investment_platforms
  WHERE user_id = p_user_id AND slug = 'trade-republic';

  IF v_platform_tr IS NULL THEN RETURN; END IF;

  -- Primer mes con transacciones
  SELECT DATE_TRUNC('month', MIN(transaction_date))::date
  INTO v_first_month
  FROM portfolio_transactions
  WHERE user_id = p_user_id AND asset_id IS NOT NULL;

  IF v_first_month IS NULL THEN RETURN; END IF;

  DELETE FROM portfolio_snapshots WHERE user_id = p_user_id;

  v_cur_month := v_first_month;

  WHILE v_cur_month <= DATE_TRUNC('month', CURRENT_DATE) LOOP

    -- Último día del mes (o hoy si es el mes actual)
    v_month := LEAST(
      (DATE_TRUNC('month', v_cur_month) + INTERVAL '1 month - 1 day')::date,
      CURRENT_DATE
    );

    -- Capital invertido acumulado hasta este mes
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

    -- Valor de mercado: qty × precio_histórico por activo
    -- Si no hay precio para un activo en ese mes: usa su base de coste
    SELECT COALESCE(SUM(
      CASE
        WHEN ph.price_eur IS NOT NULL AND pos.qty > 0.000001
          THEN pos.qty * ph.price_eur
        ELSE pos.cost_basis
      END
    ), 0)
    INTO v_total_value
    FROM (
      -- Posición acumulada + coste por activo hasta este mes
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
      -- Precio más reciente hasta este mes para este ISIN
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
      pl_amount      = EXCLUDED.pl_amount,
      pl_percentage  = EXCLUDED.pl_percentage;

    -- Avanzar al siguiente mes
    v_cur_month := (DATE_TRUNC('month', v_cur_month) + INTERVAL '1 month')::date;

  END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
