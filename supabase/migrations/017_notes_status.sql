-- ══════════════════════════════════════
-- Migration 017: Note status field
-- Adds status for idea/in_progress/done tracking
-- ══════════════════════════════════════

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'none'
    CHECK (status IN ('none', 'idea', 'in_progress', 'done'));
