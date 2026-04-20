-- ============================================================
-- FIX: Convertir unrealized_gain de GENERATED ALWAYS a columna
-- regular con trigger BEFORE UPDATE.
--
-- PostgREST tiene un bug con columnas GENERATED ALWAYS AS: aunque
-- no se envíe el campo en el UPDATE, la capa de PostgREST falla
-- al intentar escribir en la columna generada. La solución es
-- sustituirla por un BEFORE INSERT/UPDATE trigger equivalente.
-- ============================================================

-- 1. Eliminar la expresión generada (PostgreSQL 15+)
ALTER TABLE indexa_positions
  ALTER COLUMN unrealized_gain DROP EXPRESSION IF EXISTS;

-- 2. Función que calcula el valor latente
CREATE OR REPLACE FUNCTION _compute_indexa_unrealized_gain()
RETURNS TRIGGER AS $$
BEGIN
  NEW.unrealized_gain := NEW.total_value - NEW.total_cost;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger que la ejecuta en INSERT y UPDATE
DROP TRIGGER IF EXISTS trg_indexa_unrealized_gain ON indexa_positions;
CREATE TRIGGER trg_indexa_unrealized_gain
  BEFORE INSERT OR UPDATE ON indexa_positions
  FOR EACH ROW EXECUTE FUNCTION _compute_indexa_unrealized_gain();
