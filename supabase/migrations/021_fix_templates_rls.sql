-- Fix: project_templates RLS policy
-- La policy FOR ALL permitía que cualquier usuario autenticado modificara/eliminara
-- las plantillas del sistema (is_system = true). Se separa en policies por operación.

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users access own templates or system templates" ON project_templates;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- SELECT: el usuario puede ver sus propias plantillas Y las del sistema
DO $$ BEGIN
  CREATE POLICY "Users select own or system templates"
    ON project_templates FOR SELECT
    USING (auth.uid() = user_id OR is_system = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- INSERT: solo puede crear sus propias plantillas (user_id debe coincidir)
DO $$ BEGIN
  CREATE POLICY "Users insert own templates"
    ON project_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id AND is_system = false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- UPDATE: solo puede modificar sus propias plantillas (no las del sistema)
DO $$ BEGIN
  CREATE POLICY "Users update own templates"
    ON project_templates FOR UPDATE
    USING (auth.uid() = user_id AND is_system = false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DELETE: solo puede eliminar sus propias plantillas (no las del sistema)
DO $$ BEGIN
  CREATE POLICY "Users delete own templates"
    ON project_templates FOR DELETE
    USING (auth.uid() = user_id AND is_system = false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
