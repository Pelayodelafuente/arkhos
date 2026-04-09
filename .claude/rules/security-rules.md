# Reglas de seguridad — Arkhos (invariantes)

## Variables de entorno
- NUNCA en código cliente: SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, UPSTASH_REDIS_REST_TOKEN
- En cliente solo: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- Antes de commit: `git diff --staged | grep -iE "(service_role|api_key|secret)" | grep -v example`

## Supabase RLS
- Toda tabla nueva DEBE tener: `ALTER TABLE X ENABLE ROW LEVEL SECURITY;`
- Política mínima obligatoria: `CREATE POLICY "owner_only" ON X FOR ALL USING (auth.uid() = user_id);`
- Para tablas de referencia (sin user_id): policy de solo lectura para usuarios autenticados
- Nunca: queries con service_role key desde el cliente browser

## API Routes
- Rate limiting en todas las rutas que llamen a APIs externas o IA
- Validación Zod en todos los inputs de API routes
- No exponer stack traces en errores de producción (usa `NODE_ENV` check)
- Headers de seguridad en next.config.ts: X-Frame-Options, X-Content-Type-Options
- Siempre verificar sesión de usuario antes de llamar a Anthropic SDK

## Autenticación
- MFA activo en Supabase Dashboard
- Middleware verifica sesión en TODAS las rutas (dashboard)
- Tokens de sesión nunca en localStorage — usar cookies httpOnly vía Supabase Auth
- proxy.ts verifica AAL: aal1→aal2 redirige a /verify-mfa

## Dependencias
- Antes de instalar una dependencia nueva: verificar que tiene mantenimiento activo (commits en últimos 6 meses)
- Solo pnpm, nunca npm o yarn en este proyecto
- Lockfile siempre versionado: pnpm-lock.yaml

## Markdown / XSS
- Usar `sanitizeHtml()` de `@/lib/utils/sanitize` antes de cualquier `dangerouslySetInnerHTML`
- No confiar en contenido de Supabase sin sanitizar si se va a renderizar como HTML
