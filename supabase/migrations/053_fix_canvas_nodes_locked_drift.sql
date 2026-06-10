-- Migración 053: corrige deriva de esquema detectada en auditoría 2026-06-10.
-- La migración 007 definía canvas_nodes.locked pero nunca se aplicó a la DB real:
-- la feature de bloquear nodos fallaba silenciosamente en producción.
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;
