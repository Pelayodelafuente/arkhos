CREATE TABLE IF NOT EXISTS note_backlinks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_note_id   UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id   UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_self_reference CHECK (source_note_id != target_note_id),
  CONSTRAINT unique_backlink UNIQUE(source_note_id, target_note_id)
);

ALTER TABLE note_backlinks ENABLE ROW LEVEL SECURITY;

CREATE POLICY note_backlinks_user_policy ON note_backlinks
  FOR ALL USING (
    source_note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
  );

CREATE INDEX idx_note_backlinks_source ON note_backlinks(source_note_id);
CREATE INDEX idx_note_backlinks_target ON note_backlinks(target_note_id);
