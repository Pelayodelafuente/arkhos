---
name: supabase-security
description: Audita la seguridad de la capa de datos Supabase: RLS, Storage buckets, variables de entorno, API keys. Activar antes de deploys o al añadir funcionalidad que toca la DB.
context: fork
---

# Supabase Security Audit — Arkhos

## 1. Verificar RLS en todas las tablas
```bash
echo "Sin RLS (CRÍTICO si aparece algo):"
comm -23 \
  <(grep -r "CREATE TABLE" supabase/migrations/ | grep -oP 'TABLE\s+\K[a-z_]+' | sort -u) \
  <(grep -r "ENABLE ROW LEVEL SECURITY" supabase/migrations/ | grep -oP 'ON\s+\K[a-z_]+' | sort -u)
```

## 2. Verificar que service_role no está en código cliente
```bash
grep -r "service_role" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env"
```

## 3. Verificar auth guard en API routes con Anthropic
```bash
grep -r "getUser\|auth\." src/app/api/ --include="*.ts" -l
```

## 4. Verificar que .env.local no está en git
```bash
git log --all --full-history -- .env.local
git status .env.local
```

## Output
Genera reporte: Crítico / Alto / Medio / Bajo
