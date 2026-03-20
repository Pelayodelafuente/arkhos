-- ══════════════════════════════════════
-- Arkhos — Notes Module Enhancements
-- Migration 007: UNIQUE constraint, locked, group_id, performance
-- ══════════════════════════════════════

-- ─── 1. Clean up duplicate canvas_nodes (keep earliest by created_at) ───

DELETE FROM canvas_nodes a
USING canvas_nodes b
WHERE a.created_at > b.created_at
  AND a.canvas_id = b.canvas_id
  AND a.note_id = b.note_id
  AND a.note_id IS NOT NULL;

-- ─── 2. Partial UNIQUE index (only for note-type nodes) ───

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_canvas_note
  ON canvas_nodes(canvas_id, note_id)
  WHERE note_id IS NOT NULL;

-- ─── 3. New columns on canvas_nodes ───

ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE;
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES canvas_nodes(id) ON DELETE SET NULL;

-- ─── 4. Index for group lookups ───

CREATE INDEX IF NOT EXISTS idx_canvas_nodes_group ON canvas_nodes(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canvas_nodes_note ON canvas_nodes(note_id) WHERE note_id IS NOT NULL;
