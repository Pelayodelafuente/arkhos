-- ══════════════════════════════════════
-- Arkhos — Projects Refinements
-- Migration 003: logo_url, project_types, project_statuses
-- ══════════════════════════════════════

-- ─── ADD logo_url TO PROJECTS ─────────

ALTER TABLE projects ADD COLUMN logo_url TEXT;

-- ─── DROP CHECK CONSTRAINTS ──────────
-- Replace hardcoded type/status checks with FK to user-defined tables.
-- The old CHECK constraints on type and status are removed so values
-- can come from the user's custom project_types and project_statuses.

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_type_check;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- ─── PROJECT TYPES ────────────────────

CREATE TABLE project_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Box',
  color TEXT NOT NULL DEFAULT '#888780',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own project types"
  ON project_types FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_project_types_user ON project_types (user_id, sort_order);

-- ─── PROJECT STATUSES ─────────────────

CREATE TABLE project_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#888780',
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE project_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own project statuses"
  ON project_statuses FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_project_statuses_user ON project_statuses (user_id, sort_order);

-- ─── STORAGE BUCKET (run manually) ────
-- In Supabase Dashboard > Storage, create bucket:
--   Name: project-logos
--   Public: true
--   Allowed MIME types: image/jpeg, image/png, image/webp
--   Max file size: 2MB
--
-- RLS policies for storage.objects:
--   INSERT: auth.uid() IS NOT NULL AND bucket_id = 'project-logos'
--           AND (storage.foldername(name))[1] = auth.uid()::text
--   SELECT: bucket_id = 'project-logos' (public read)
--   DELETE: auth.uid() IS NOT NULL AND bucket_id = 'project-logos'
--           AND (storage.foldername(name))[1] = auth.uid()::text
