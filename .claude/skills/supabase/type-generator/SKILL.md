---
name: gen-types
description: Regenera los tipos TypeScript desde la base de datos Supabase. Activar tras crear o modificar migraciones, o cuando los tipos TypeScript no coinciden con el schema de la DB.
---

# Type Generator — Arkhos

## Proceso

**Paso 1: Obtener PROJECT_REF**
```bash
grep NEXT_PUBLIC_SUPABASE_URL .env.local | grep -oE '[a-z]+(?=\.supabase\.co)'
```

**Paso 2: Regenerar tipos**
```bash
npx supabase gen types typescript \
  --project-id TU_PROJECT_REF \
  --schema public > src/lib/supabase/types.ts
```

**Paso 3: Verificar**
```bash
pnpm exec tsc --noEmit
```

**Si hay errores de tipo tras la regeneración:**
- Busca con Grep las interfaces que extendían tipos de DB
- Los campos nullable cambian de `string` a `string | null`
- Actualiza los tipos en `src/types/*.ts` si es necesario

## Nota
El archivo de tipos de Arkhos está en `src/lib/supabase/types.ts`, no en `src/types/database.types.ts`.
