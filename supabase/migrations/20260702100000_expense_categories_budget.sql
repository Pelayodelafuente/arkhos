-- Presupuesto mensual opcional por categoría de gastos.
-- Se compara contra el gasto mensual amortizado de las suscripciones activas
-- de la categoría; NULL = sin presupuesto definido.
ALTER TABLE expense_categories
  ADD COLUMN IF NOT EXISTS budget numeric(10,2) CHECK (budget IS NULL OR budget > 0);

COMMENT ON COLUMN expense_categories.budget IS
  'Presupuesto mensual en EUR para la categoría (NULL = sin presupuesto)';
