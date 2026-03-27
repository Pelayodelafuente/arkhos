-- ══════════════════════════════════════
-- Migration 012: Project Tags System
-- Tags per project, many-to-many with tasks
-- ══════════════════════════════════════

-- Tags table: each project can have its own set of tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#888780',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Junction table: many-to-many between tasks and tags
CREATE TABLE IF NOT EXISTS task_tags (
  task_id UUID NOT NULL REFERENCES phase_tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_tags_project_id ON tags(project_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

-- RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- Tags: user can only access tags for their own projects
CREATE POLICY "Users can view their project tags"
  ON tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tags.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tags to their projects"
  ON tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tags.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their project tags"
  ON tags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tags.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their project tags"
  ON tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tags.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Task tags: user can only access task_tags for their own projects
CREATE POLICY "Users can view their task tags"
  ON task_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM phase_tasks
      JOIN project_phases ON project_phases.id = phase_tasks.phase_id
      JOIN projects ON projects.id = project_phases.project_id
      WHERE phase_tasks.id = task_tags.task_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert task tags"
  ON task_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM phase_tasks
      JOIN project_phases ON project_phases.id = phase_tasks.phase_id
      JOIN projects ON projects.id = project_phases.project_id
      WHERE phase_tasks.id = task_tags.task_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete task tags"
  ON task_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM phase_tasks
      JOIN project_phases ON project_phases.id = phase_tasks.phase_id
      JOIN projects ON projects.id = project_phases.project_id
      WHERE phase_tasks.id = task_tags.task_id
      AND projects.user_id = auth.uid()
    )
  );
