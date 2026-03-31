-- ══════════════════════════════════════
-- Arkhos — Migration 014: Canvas Advanced
-- Grupos colapsables + estilos de conexión
-- ══════════════════════════════════════

-- Grupos colapsables
ALTER TABLE canvas_nodes ADD COLUMN IF NOT EXISTS collapsed BOOLEAN DEFAULT FALSE;

-- Estilos de conexión
ALTER TABLE canvas_edges ADD COLUMN IF NOT EXISTS style TEXT DEFAULT 'arrow';
