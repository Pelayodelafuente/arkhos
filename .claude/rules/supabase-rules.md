# Reglas Supabase — Arkhos

## Migrations
- Formato desde la 053: timestamp del CLI — `YYYYMMDDHHMMSS_nombre_accion.sql` (ver `supabase/migrations/README.md`)
- Aplicar SIEMPRE vía `mcp supabase apply_migration` (queda registrada en la DB) y versionar el mismo SQL en `supabase/migrations/`
- Nunca modificar migraciones ya aplicadas en producción — crear nueva migración
- Toda migración nueva incluye: tabla, RLS enable, políticas, índices relevantes
- Tras crear migration: regenerar tipos (`mcp supabase generate_typescript_types`) → `src/lib/supabase/types.ts`

## Queries
- Siempre usar el cliente typed: `createServerClient<Database>` o `createBrowserClient<Database>`
- Preferir `select('col1, col2')` sobre `select('*')` — solo las columnas necesarias
- Para queries complejas con múltiples joins: crear una función SQL y llamarla con `rpc()`
- Siempre manejar el error de Supabase: `const { data, error } = await...` — nunca ignorar error

## Storage
- Buckets: project-logos (público), note-images (privado con RLS)
- Rutas: `{user_id}/{uuid}.{ext}` para garantizar unicidad
- Tipos permitidos: image/jpeg, image/png, image/webp, image/gif

## Realtime
- Usar solo cuando sea necesario (Mercados para precios en vivo)
- Siempre desuscribirse en el cleanup de useEffect/unmount
- No activar Realtime en tablas con mucha escritura (activity_log)

## Edge Functions
- Para lógica que requiere service_role key
- Para webhooks de terceros
- Para cron jobs (con pg_cron o Supabase Scheduled Functions)
- Nunca llamar a Edge Functions desde otro Edge Function — usa DB functions

## Clientes por contexto
- Server Components / Server Actions: `createServerClient` de `@supabase/ssr`
- Client Components: `createBrowserClient` de `@supabase/ssr`
- API Routes (auth requerida): `createServerClient` + verificar `getUser()` antes de cualquier operación
