---
name: audit
description: Ejecuta una auditoría completa del proyecto: TypeScript, tests, build, seguridad, performance, deuda técnica. Activar cuando el usuario pide "auditoría", "revisar todo", "estado del proyecto" o antes de un release importante.
context: fork
---

# Auditoría Completa de Arkhos

Ejecuta en orden. Genera reporte en `docs/AUDIT-$(date +%Y%m%d).md`.

## 1. TypeScript
```bash
pnpm exec tsc --noEmit 2>&1
echo "Exit code: $?"
```

## 2. Tests
```bash
pnpm test --run 2>&1 | tail -20
```

## 3. Build
```bash
pnpm build 2>&1 | tail -30
```

## 4. ESLint
```bash
npx eslint src/ --format compact 2>&1 | tail -20
```

## 5. Seguridad rápida
```bash
grep -r "service_role\|ANTHROPIC_API_KEY" src/ --include="*.ts" --include="*.tsx" | grep -v ".env\|example"
git log --all -- .env.local 2>/dev/null | head -3
```

## 6. Bundle size
```bash
pnpm build 2>&1 | grep -E "Route|First Load|kB" | head -20
```

## 7. Deuda técnica
```bash
grep -r "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" --include="*.tsx" | wc -l
grep -r "TODO\|FIXME" src/ --include="*.ts" --include="*.tsx" | head -10
```

## 8. Dependencias
```bash
pnpm outdated 2>&1 | head -20
```

## Formato del reporte
```markdown
# Auditoría Arkhos — FECHA

## Resumen ejecutivo
| Check | Estado | Detalles |
|-------|--------|----------|
| TypeScript | ✅/❌ | X errores |
| Tests | ✅/❌ | X/Y pasando |
| Build | ✅/❌ | ... |
| Seguridad | ✅/⚠️/❌ | ... |

## Acciones requeridas
### Crítico (hoy)
### Alto (esta semana)
### Medio (próxima iteración)
```
