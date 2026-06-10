# Migraciones — Arkhos

## ⚠️ Estado real (auditoría 2026-06-10)

La mayoría de migraciones de esta carpeta se aplicaron **manualmente** (SQL editor),
por lo que la tabla `supabase_migrations.schema_migrations` de la DB solo registra
unas pocas. La fuente de verdad del esquema es **la base de datos en producción**,
no esta carpeta. Tras cualquier cambio de esquema: regenerar tipos
(`mcp supabase generate_typescript_types` → `src/lib/supabase/types.ts`).

Deriva conocida y corregida: `canvas_nodes.locked` (definida en la 007, nunca
aplicada — corregida en la 053).

## Numeración

- Las migraciones 001-053 usan prefijo secuencial de 3 dígitos. Hay **números
  duplicados históricos** (011, 013, 027 ×2): no renombrar — ya están aplicadas.
- **A partir de la 053, usar el formato timestamp del CLI de Supabase**:
  `YYYYMMDDHHMMSS_nombre_descriptivo.sql` (p. ej. `20260611093000_add_agenda.sql`).
  Esto elimina las colisiones de numeración y es el formato que registra el CLI.

## Reglas (de `.claude/rules/supabase-rules.md`)

- Nunca modificar una migración ya aplicada — crear una nueva.
- Toda tabla nueva incluye: `ENABLE ROW LEVEL SECURITY` + política owner_only + índices.
- Aplicar siempre vía `mcp supabase apply_migration` (queda registrada) y
  versionar el mismo SQL en esta carpeta.

## Orden de aplicación histórico (duplicados)

Para un restore desde cero, el orden alfabético de archivo coincide con el orden
en que se aplicaron: `011_notes_folders` → `011_subscription_icon_url` →
`013_projects_refactor` → `013_task_comments` → `027_fix_snapshot_rpc_current_month`
→ `027_indexa_schema`.
