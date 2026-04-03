-- ══════════════════════════════════════
-- Migration 018 — Notes cross-module links
-- Notas ↔ Proyectos + Notas ↔ Suscripciones
-- ══════════════════════════════════════

-- Add project_id and subscription_id to notes table

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

-- Indexes for efficient lookups

CREATE INDEX IF NOT EXISTS notes_project_id_idx ON notes(project_id);
CREATE INDEX IF NOT EXISTS notes_subscription_id_idx ON notes(subscription_id);

-- RLS: the existing policies on notes already filter by auth.uid() = user_id
-- No new policies needed — the new columns are plain data fields on the notes table
-- which is already protected by RLS.
