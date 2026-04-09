---
name: tech-debt
description: Detecta y prioriza deuda técnica en el proyecto. Activar cuando se pide "revisar deuda técnica", "limpiar código", o antes de empezar una fase nueva.
context: fork
---

# Tech Debt Analyzer — Arkhos

## Detección automática

```bash
echo "=== TODO/FIXME/HACK ==="
grep -r "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" --include="*.tsx" | wc -l
grep -r "TODO\|FIXME\|HACK" src/ --include="*.ts" --include="*.tsx"

echo "=== any types ==="
grep -r ": any\b\|as any\b" src/ --include="*.ts" --include="*.tsx" | grep -v "// eslint-disable"

echo "=== console.log en producción ==="
grep -r "console\.log\b" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env.NODE_ENV\|// eslint-disable"

echo "=== Componentes con useEffect para fetching ==="
grep -r "useEffect.*fetch\b" src/components/ --include="*.tsx"

echo "=== select('*') en queries ==="
grep -r "select\('\*'\)\|select(\"\*\")" src/lib/ --include="*.ts"
```

## Prioridad de fixes
1. **Crítico**: `any` types, console.log en prod, select('*')
2. **Alto**: TODOs bloqueantes, useEffect para fetching
3. **Medio**: TODOs no bloqueantes, código duplicado
4. **Backlog**: optimizaciones, refactors cosméticos

## Output
Actualiza `docs/PENDING-FIXES.md` con los hallazgos priorizados.
