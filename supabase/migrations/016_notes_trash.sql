-- ══════════════════════════════════════
-- Migration 016: Notes soft-delete (papelera)
-- Adds deleted_at for trash functionality
-- ══════════════════════════════════════

ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index to efficiently query trash
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at
  ON notes(user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;
