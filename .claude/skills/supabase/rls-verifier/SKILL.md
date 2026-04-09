---
name: rls-check
description: Verifica que todas las tablas del proyecto tienen RLS activo y las políticas correctas. Activar antes de cada deploy, cuando se detectan errores de permisos o cuando se añaden tablas nuevas.
context: fork
---

# RLS Verifier

Ejecuta esta auditoría completa:

```bash
echo "=== TABLAS DETECTADAS ==="
grep -r "CREATE TABLE" supabase/migrations/ | grep -v "IF NOT EXISTS" | grep -oP 'TABLE\s+\K[a-z_]+' | sort -u

echo "=== TABLAS CON RLS ENABLED ==="
grep -r "ENABLE ROW LEVEL SECURITY" supabase/migrations/ | grep -oP 'ON\s+\K[a-z_]+' | sort -u

echo "=== POLÍTICAS POR TABLA ==="
grep -r "CREATE POLICY" supabase/migrations/ | grep -oP 'ON\s+\K[a-z_]+' | sort | uniq -c | sort -rn
```

Genera reporte en `docs/RLS-AUDIT-$(date +%Y%m%d).md`:
- Tablas con RLS: ✅
- Tablas sin RLS: ❌ CRÍTICO
- Tablas con políticas incompletas: ⚠️ REVISAR
