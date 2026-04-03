-- ══════════════════════════════════════
-- Migration 019 — Notas: Full-Text Search
-- tsvector + trigger + GIN index
-- ══════════════════════════════════════

-- 1. Añadir columna tsvector
ALTER TABLE notes ADD COLUMN IF NOT EXISTS content_tsvector TSVECTOR;

-- 2. Función que genera el tsvector ponderado
--    Peso A (mayor): título
--    Peso B (menor): contenido de la nota (limpiado de HTML)
CREATE OR REPLACE FUNCTION notes_tsvector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.content_tsvector :=
    setweight(to_tsvector('spanish', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(
      regexp_replace(coalesce(NEW.content, ''), '<[^>]*>', ' ', 'g'), ''
    )), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger en INSERT y UPDATE (título o contenido)
DROP TRIGGER IF EXISTS notes_tsvector_trigger ON notes;
CREATE TRIGGER notes_tsvector_trigger
  BEFORE INSERT OR UPDATE OF title, content ON notes
  FOR EACH ROW EXECUTE FUNCTION notes_tsvector_update();

-- 4. Índice GIN para búsquedas eficientes
CREATE INDEX IF NOT EXISTS notes_content_tsvector_idx ON notes USING GIN(content_tsvector);

-- 5. Backfill filas existentes
UPDATE notes SET content_tsvector =
  setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('spanish', coalesce(
    regexp_replace(coalesce(content, ''), '<[^>]*>', ' ', 'g'), ''
  )), 'B');
