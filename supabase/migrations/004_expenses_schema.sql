-- ══════════════════════════════════════
-- Arkhos — Expenses Schema
-- Migration 004: expense_categories + subscriptions
-- ══════════════════════════════════════

-- ─── EXPENSE CATEGORIES ──────────────

CREATE TABLE expense_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  icon        TEXT        NOT NULL,
  color       TEXT        NOT NULL,
  sort_order  INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own expense_categories"
  ON expense_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own expense_categories"
  ON expense_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own expense_categories"
  ON expense_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own expense_categories"
  ON expense_categories FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── SUBSCRIPTIONS ───────────────────
-- billing_day: día RECURRENTE del mes en que se cobra (1-31).
-- Ej: Netflix cobra el día 1 cada mes → billing_day = 1.
-- NO es la fecha de inicio de la suscripción (eso es started_at).

CREATE TABLE subscriptions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id  UUID        REFERENCES expense_categories(id) ON DELETE SET NULL,
  name         TEXT        NOT NULL,
  icon         TEXT        NOT NULL,
  color        TEXT        NOT NULL,
  amount       NUMERIC(10,2) NOT NULL,
  currency     TEXT        DEFAULT 'EUR',
  cycle        TEXT        NOT NULL CHECK (cycle IN ('monthly', 'annual')),
  billing_day  INTEGER     NOT NULL CHECK (billing_day BETWEEN 1 AND 31),
  is_active    BOOLEAN     DEFAULT true,
  url          TEXT,
  notes        TEXT,
  started_at   DATE,
  cancelled_at DATE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own subscriptions"
  ON subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── ÍNDICES ─────────────────────────

CREATE INDEX idx_expense_categories_user
  ON expense_categories(user_id);

CREATE INDEX idx_subscriptions_user
  ON subscriptions(user_id);

CREATE INDEX idx_subscriptions_category
  ON subscriptions(category_id);

CREATE INDEX idx_subscriptions_cycle
  ON subscriptions(user_id, cycle);

CREATE INDEX idx_subscriptions_billing
  ON subscriptions(user_id, billing_day);

CREATE INDEX idx_subscriptions_active
  ON subscriptions(user_id, is_active);

-- ─── SEED DE CATEGORÍAS ──────────────
-- Las categorías por defecto son específicas de cada usuario (requieren user_id real).
-- No se pueden insertar aquí sin un usuario concreto.
-- Crear desde la aplicación en primer uso mediante seedUserExpenseDefaults()
-- con las categorías sugeridas: Streaming, Música, Herramientas dev, Cloud,
-- Gaming, Productividad, Noticias, Fitness.
