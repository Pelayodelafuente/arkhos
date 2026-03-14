-- ══════════════════════════════════════
-- Arkhos — Projects Module Schema
-- Migration 002: projects + phases + tasks + links
-- ══════════════════════════════════════

-- ─── PROJECTS ─────────────────────────

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Box',
  type TEXT NOT NULL DEFAULT 'Web'
    CHECK (type IN ('Web', 'CLI', 'API', 'Mobile', 'Script', 'Design', 'Other')),
  status TEXT NOT NULL DEFAULT 'idea'
    CHECK (status IN ('active', 'paused', 'done', 'idea')),
  stack TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  start_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own projects"
  ON projects FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_projects_user_id ON projects (user_id);
CREATE INDEX idx_projects_user_status ON projects (user_id, status);
CREATE INDEX idx_projects_sort_order ON projects (user_id, sort_order);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── PROJECT PHASES ───────────────────

CREATE TABLE project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in-progress', 'done')),
  notes TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own phases"
  ON project_phases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_phases.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE INDEX idx_phases_project_id ON project_phases (project_id);
CREATE INDEX idx_phases_sort_order ON project_phases (project_id, sort_order);

-- ─── PHASE TASKS ──────────────────────

CREATE TABLE phase_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  priority TEXT NOT NULL DEFAULT 'none'
    CHECK (priority IN ('none', 'low', 'medium', 'high')),
  content TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE phase_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own tasks"
  ON phase_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_phases
      JOIN projects ON projects.id = project_phases.project_id
      WHERE project_phases.id = phase_tasks.phase_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE INDEX idx_tasks_phase_id ON phase_tasks (phase_id);
CREATE INDEX idx_tasks_sort_order ON phase_tasks (phase_id, sort_order);

CREATE TRIGGER phase_tasks_updated_at
  BEFORE UPDATE ON phase_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── TASK LINKS ───────────────────────

CREATE TABLE task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES phase_tasks(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  label TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE task_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own task links"
  ON task_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM phase_tasks
      JOIN project_phases ON project_phases.id = phase_tasks.phase_id
      JOIN projects ON projects.id = project_phases.project_id
      WHERE phase_tasks.id = task_links.task_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE INDEX idx_task_links_task_id ON task_links (task_id);
