-- Task comments (like git commit messages per task)
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES phase_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at DESC);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Solo el dueño del proyecto puede ver/crear/borrar comentarios
CREATE POLICY "task_comments_select" ON task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM phase_tasks pt
      JOIN project_phases pp ON pt.phase_id = pp.id
      JOIN projects p ON pp.project_id = p.id
      WHERE pt.id = task_comments.task_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "task_comments_insert" ON task_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM phase_tasks pt
      JOIN project_phases pp ON pt.phase_id = pp.id
      JOIN projects p ON pp.project_id = p.id
      WHERE pt.id = task_comments.task_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "task_comments_delete" ON task_comments
  FOR DELETE USING (auth.uid() = user_id);
