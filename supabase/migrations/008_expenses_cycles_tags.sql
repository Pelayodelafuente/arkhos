-- ══════════════════════════════════════
-- Arkhos — Expenses Cycles & Tags
-- Migration 008: quarterly/semiannual cycles + tags column
-- ══════════════════════════════════════

-- ─── EXPAND CYCLE CHECK CONSTRAINT ──────────
-- Drop old CHECK and add new one with quarterly + semiannual

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_cycle_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_cycle_check
  CHECK (cycle IN ('monthly', 'quarterly', 'semiannual', 'annual'));

-- ─── ADD TAGS COLUMN ──────────────────────
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- ─── GIN INDEX ON TAGS ────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_tags ON subscriptions USING GIN (tags);
