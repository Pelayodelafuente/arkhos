-- ============================================================
-- Función RPC: aplica una aportación a la posición de Indexa.
--
-- Usa SQL directo (no PostgREST) para evitar el bug de
-- GENERATED ALWAYS AS columns con PostgREST, y recalcula
-- allocation_pct de todas las posiciones del usuario.
-- ============================================================

CREATE OR REPLACE FUNCTION apply_indexa_contribution(
  p_user_id        UUID,
  p_fund_id        UUID,
  p_shares         NUMERIC,
  p_amount         NUMERIC,
  p_current_price  NUMERIC DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_pos_id        UUID;
  v_cur_shares    NUMERIC;
  v_cur_cost      NUMERIC;
  v_cur_price     NUMERIC;
  v_new_shares    NUMERIC;
  v_new_cost      NUMERIC;
  v_new_price     NUMERIC;
  v_new_value     NUMERIC;
  v_total_value   NUMERIC;
BEGIN
  SELECT id, shares, total_cost, price_per_share
  INTO v_pos_id, v_cur_shares, v_cur_cost, v_cur_price
  FROM indexa_positions
  WHERE user_id = p_user_id AND fund_id = p_fund_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'position_not_found');
  END IF;

  v_new_shares := COALESCE(v_cur_shares, 0) + p_shares;
  v_new_cost   := v_cur_cost + p_amount;
  -- precio: usar el proporcionado o el actual de la posición
  v_new_price  := COALESCE(p_current_price, v_cur_price, p_amount / NULLIF(p_shares, 0));
  v_new_value  := v_new_shares * v_new_price;

  UPDATE indexa_positions
  SET shares         = v_new_shares,
      total_cost     = v_new_cost,
      total_value    = v_new_value,
      price_per_share = v_new_price,
      updated_at     = NOW()
  WHERE id = v_pos_id AND user_id = p_user_id;

  -- Recalcular allocation_pct para todas las posiciones del usuario
  SELECT SUM(total_value) INTO v_total_value
  FROM indexa_positions
  WHERE user_id = p_user_id;

  IF v_total_value > 0 THEN
    UPDATE indexa_positions
    SET allocation_pct = ROUND((total_value / v_total_value * 100)::numeric, 2)
    WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
