---
name: query-optimize
description: Analiza y optimiza queries de Supabase: detecta N+1, select estrella, falta de índices. Activar cuando hay queries lentas o al revisar el data layer.
context: fork
---

# Query Optimizer — Arkhos

## Detectar N+1
```bash
# Queries dentro de bucles (señal de N+1)
grep -r "await.*supabase" src/lib/supabase/ --include="*.ts" -A 2 | grep -B 2 "for\|forEach\|map"
```

## Detectar select('*')
```bash
grep -r "select('\*')\|select(\"\\*\")" src/lib/supabase/ --include="*.ts"
```

## Detectar columnas sin índice (aproximado)
```bash
# Busca .eq() o .filter() sin índice declarado
grep -r "\.eq(\|\.filter(\|\.order(" src/lib/supabase/ --include="*.ts" | grep -oP "'[a-z_]+'" | sort -u
```

## Checklist de optimización
- [ ] Reemplazar `select('*')` con columnas específicas
- [ ] Queries N+1 → batch con `.in()` o join SQL
- [ ] Columnas en `.eq()` / `.order()` tienen índice en la migration
- [ ] Usar `.limit()` en queries que pueden devolver muchos resultados
