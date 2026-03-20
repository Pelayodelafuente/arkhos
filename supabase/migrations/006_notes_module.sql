-- ══════════════════════════════════════
-- Arkhos — Notes Module
-- Migration 006: notes + note_canvases + canvas_nodes + canvas_edges
-- ══════════════════════════════════════

-- ─── NOTES (main entity) ──────────────

CREATE TABLE IF NOT EXISTS notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'Sin título',
  content       TEXT DEFAULT '',
  color         TEXT DEFAULT 'default',
  icon          TEXT DEFAULT 'FileText',
  is_pinned     BOOLEAN DEFAULT FALSE,
  word_count    INTEGER DEFAULT 0,
  tags          TEXT[] DEFAULT '{}',
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── NOTE CANVASES ────────────────────

CREATE TABLE IF NOT EXISTS note_canvases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT 'Mi Canvas',
  description   TEXT DEFAULT '',
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── CANVAS NODES ─────────────────────

CREATE TABLE IF NOT EXISTS canvas_nodes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id     UUID NOT NULL REFERENCES note_canvases(id) ON DELETE CASCADE,
  note_id       UUID REFERENCES notes(id) ON DELETE CASCADE,
  node_type     TEXT NOT NULL DEFAULT 'note',
  pos_x         FLOAT NOT NULL DEFAULT 0,
  pos_y         FLOAT NOT NULL DEFAULT 0,
  width         FLOAT NOT NULL DEFAULT 280,
  height        FLOAT NOT NULL DEFAULT 160,
  content       TEXT DEFAULT '',
  url           TEXT DEFAULT '',
  label         TEXT DEFAULT '',
  color         TEXT DEFAULT 'default',
  z_index       INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── CANVAS EDGES ─────────────────────

CREATE TABLE IF NOT EXISTS canvas_edges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id     UUID NOT NULL REFERENCES note_canvases(id) ON DELETE CASCADE,
  from_node_id  UUID NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  to_node_id    UUID NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  label         TEXT DEFAULT '',
  color         TEXT DEFAULT 'default',
  from_side     TEXT DEFAULT 'right',
  to_side       TEXT DEFAULT 'left',
  created_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_self_loop CHECK (from_node_id != to_node_id)
);

-- ─── INDEXES ──────────────────────────

CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX idx_canvas_nodes_canvas ON canvas_nodes(canvas_id);
CREATE INDEX idx_canvas_edges_canvas ON canvas_edges(canvas_id);
CREATE INDEX idx_note_canvases_user ON note_canvases(user_id);

-- ─── TRIGGERS (reuse existing update_updated_at) ───

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER canvases_updated_at
  BEFORE UPDATE ON note_canvases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── ROW LEVEL SECURITY ──────────────

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_user_policy" ON notes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "canvases_user_policy" ON note_canvases
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "canvas_nodes_policy" ON canvas_nodes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM note_canvases nc WHERE nc.id = canvas_nodes.canvas_id AND nc.user_id = auth.uid())
  );

CREATE POLICY "canvas_edges_policy" ON canvas_edges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM note_canvases nc WHERE nc.id = canvas_edges.canvas_id AND nc.user_id = auth.uid())
  );
