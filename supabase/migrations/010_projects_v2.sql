-- ================================================================
-- MIGRACIÓN 008 — Proyectos v2
-- ================================================================

-- 1. Extender projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS target_date DATE,
  ADD COLUMN IF NOT EXISTS repository_url TEXT;

-- 2. Extender project_phases
ALTER TABLE project_phases
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'default';

-- 3. Extender phase_tasks (DECISIÓN: un único campo 'status' unifica done + kanban_status)
--    Valores: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
--    El campo 'done' existente se mantiene por compatibilidad y se sincroniza con status='done'
ALTER TABLE phase_tasks
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tracked_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS assigned_role TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- NOTA: El campo `done` existente se conserva. Al marcar status='done', también se
-- actualiza done=true en el cliente para no romper la lógica de progreso existente.

-- 4. Tabla de time tracking
CREATE TABLE IF NOT EXISTS project_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES phase_tasks(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabla de enlaces rápidos de proyecto
CREATE TABLE IF NOT EXISTS project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT 'Link',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabla de plantillas de proyecto
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'Web',
  phases JSONB NOT NULL DEFAULT '[]',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Activar RLS en tablas nuevas
ALTER TABLE project_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

-- 8. Políticas RLS
DO $$ BEGIN
  CREATE POLICY "Users access own time entries"
    ON project_time_entries FOR ALL
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users access own project links"
    ON project_links FOR ALL
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users access own templates or system templates"
    ON project_templates FOR ALL
    USING (auth.uid() = user_id OR is_system = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9. Plantillas predefinidas del sistema (is_system=true, user_id=null)
INSERT INTO project_templates (name, description, type, is_system, phases) VALUES
(
  'Web App Completa',
  'Stack completo desde diseño hasta deploy',
  'Web',
  true,
  '[
    {"name":"Planificación","sort_order":0,"tasks":[{"text":"Definir requisitos","priority":"high"},{"text":"Wireframes iniciales","priority":"medium"}]},
    {"name":"Diseño UI/UX","sort_order":1,"tasks":[{"text":"Diseño en Figma","priority":"high"},{"text":"Sistema de diseño","priority":"medium"}]},
    {"name":"Desarrollo Frontend","sort_order":2,"tasks":[{"text":"Setup Next.js","priority":"high"},{"text":"Componentes base","priority":"medium"}]},
    {"name":"Desarrollo Backend","sort_order":3,"tasks":[{"text":"Schema de DB","priority":"high"},{"text":"API routes","priority":"medium"}]},
    {"name":"Integración y Testing","sort_order":4,"tasks":[{"text":"Tests E2E","priority":"high"},{"text":"QA manual","priority":"medium"}]},
    {"name":"Deploy y Documentación","sort_order":5,"tasks":[{"text":"Deploy en Vercel","priority":"high"},{"text":"README","priority":"low"}]}
  ]'
),
(
  'App con Claude Code',
  'Flujo optimizado para desarrollo con IA',
  'Web',
  true,
  '[
    {"name":"Definición del concepto","sort_order":0,"tasks":[{"text":"Definir alcance y objetivos","priority":"high"},{"text":"Stack tecnológico","priority":"medium"}]},
    {"name":"Arquitectura y prompts","sort_order":1,"tasks":[{"text":"Diseño del schema de datos","priority":"high"},{"text":"Estructura de carpetas","priority":"medium"}]},
    {"name":"Desarrollo con Claude Code","sort_order":2,"tasks":[{"text":"Implementar funcionalidades core","priority":"high"},{"text":"Tests y correcciones","priority":"medium"}]},
    {"name":"Testing y refinamiento","sort_order":3,"tasks":[{"text":"QA completo","priority":"high"},{"text":"Performance audit","priority":"medium"}]},
    {"name":"Deploy","sort_order":4,"tasks":[{"text":"Deploy en producción","priority":"high"},{"text":"Monitorización","priority":"low"}]}
  ]'
),
(
  'Landing Page',
  'Página de aterrizaje rápida y efectiva',
  'Web',
  true,
  '[
    {"name":"Diseño","sort_order":0,"tasks":[{"text":"Copywriting","priority":"high"},{"text":"Diseño visual","priority":"high"}]},
    {"name":"Desarrollo","sort_order":1,"tasks":[{"text":"Maquetación responsive","priority":"high"},{"text":"Optimización imágenes","priority":"medium"}]},
    {"name":"SEO y analítica","sort_order":2,"tasks":[{"text":"Meta tags y OG","priority":"high"},{"text":"Google Analytics","priority":"medium"}]},
    {"name":"Launch","sort_order":3,"tasks":[{"text":"Deploy","priority":"high"},{"text":"Pruebas cross-browser","priority":"medium"}]}
  ]'
),
(
  'Proyecto Personal',
  'Estructura flexible para proyectos propios',
  'Personal',
  true,
  '[
    {"name":"Idea y planificación","sort_order":0,"tasks":[{"text":"Definir objetivo","priority":"high"}]},
    {"name":"Ejecución","sort_order":1,"tasks":[{"text":"Primera iteración","priority":"high"}]},
    {"name":"Revisión","sort_order":2,"tasks":[{"text":"Evaluar resultados","priority":"medium"}]}
  ]'
)
ON CONFLICT DO NOTHING;

-- 10. Índices de performance
CREATE INDEX IF NOT EXISTS idx_phase_tasks_status ON phase_tasks(status);
CREATE INDEX IF NOT EXISTS idx_phase_tasks_due_date ON phase_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_project_time_entries_task ON project_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_project_time_entries_project ON project_time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_project_links_project ON project_links(project_id);
