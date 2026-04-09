---
name: migration
description: Asiste en crear migraciones SQL con numeración automática, RLS completo y regeneración de tipos. Activar cuando el usuario menciona "migración", "nueva tabla", "modificar tabla", "añadir columna" o cuando se necesite modificar el schema de Supabase.
---

# Migration Assistant

## Proceso automático

**Paso 1: Determinar número de migración**
```bash
ls supabase/migrations/ | sort | tail -1 | grep -oE '^[0-9]+' | awk '{printf "%03d", $1+1}'
```
Actualmente: próxima es `022_*`

**Paso 2: Crear el archivo SQL**
Nombre: `supabase/migrations/NNN_descripcion_corta.sql`

**Plantilla de migration completa:**
```sql
-- Migration NNN: descripción
-- Created: FECHA

CREATE TABLE IF NOT EXISTS nombre_tabla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- columnas del dominio
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nombre_tabla_user_id ON nombre_tabla(user_id);
CREATE INDEX IF NOT EXISTS idx_nombre_tabla_created_at ON nombre_tabla(created_at DESC);

ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_read" ON nombre_tabla FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert" ON nombre_tabla FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update" ON nombre_tabla FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_delete" ON nombre_tabla FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE TRIGGER update_nombre_tabla_updated_at
  BEFORE UPDATE ON nombre_tabla
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Paso 3: Regenerar tipos TypeScript**
```bash
npx supabase gen types typescript \
  --project-id $(grep NEXT_PUBLIC_SUPABASE_URL .env.local | grep -oE '[a-z]+(?=\.supabase\.co)') \
  --schema public > src/lib/supabase/types.ts
```

**Paso 4: Verificar**
```bash
pnpm exec tsc --noEmit
```
