---
name: supabase
description: >
  Supabase conventions for Arkhos — correct client usage per context, RLS policies, migrations, MFA.
  Trigger: When writing code that interacts with Supabase (auth, database, storage, RLS, migrations).
license: MIT
metadata:
  author: pelayo
  version: "1.0"
---

# Supabase Skill — Arkhos

## Cliente correcto por contexto

- Server Component / Server Action → `createServerClient` (`@supabase/ssr`)
- Client Component → `createBrowserClient` (`@supabase/ssr`)
- Route Handler → `createServerClient` con `cookies()`
- NUNCA importar `createClient` directamente de `@supabase/supabase-js`

## RLS — Regla de oro

Cada nueva tabla DEBE tener en su migration:

1. `ALTER TABLE tabla ENABLE ROW LEVEL SECURITY;`
2. Policy SELECT: `USING (auth.uid() = user_id)`
3. Policy INSERT: `WITH CHECK (auth.uid() = user_id)`
4. Policy UPDATE: `USING (auth.uid() = user_id)`
5. Policy DELETE: `USING (auth.uid() = user_id)`

Tablas hijas (sin `user_id` directo):
```sql
EXISTS (SELECT 1 FROM parent WHERE parent.id = child.parent_id AND parent.user_id = auth.uid())
```

## Migrations (convención Arkhos)

- Numeración: `001_`, `002_`, `003_`...
- Siempre incluir: tabla + RLS + índices + trigger `updated_at`
- Trigger `updated_at` estándar (copiar de migration 001)
- Aplicar en: Supabase Dashboard → SQL Editor → Run

## Tipos

- Actualizar `src/lib/supabase/types.ts` tras cada migration
- Formato: `Row`, `Insert`, `Update` por tabla

## MFA

- Verificar AAL2 en `src/proxy.ts` con `mfa.getAuthenticatorAssuranceLevel()`
- Enrollment en `/settings/security`
- Verificación en `/verify-mfa`
