---
name: cierre
description: Protocolo completo de cierre de sesión. Activar cuando el usuario dice "terminar", "cerrar sesión", "hasta mañana", "acabar" o al finalizar el trabajo del día.
---

# Protocolo de cierre de sesión — Arkhos

## Verificación final (obligatorio)

```bash
echo "=== VERIFICACIÓN FINAL ==="
pnpm exec tsc --noEmit && echo "✅ TypeScript OK" || echo "❌ TypeScript ERRORS"
pnpm test --run 2>&1 | tail -3
pnpm build 2>&1 | tail -5
```

Si alguna verificación falla: PARA y corrige antes de continuar.

## Commit de cierre

```bash
git status
git add -A
git log --oneline -1
```

Genera mensaje de commit descriptivo: `tipo(scope): resumen de lo hecho`

## Actualizar documentación

1. Actualiza `docs/STATUS.md` — marca como completadas las tareas realizadas
2. Actualiza `docs/CHANGELOG.md` — añade entrada con fecha y cambios
3. Actualiza `docs/PENDING-FIXES.md` — añade/cierra pendientes según corresponda

## Guardar en memoria (Engram — OBLIGATORIO)

Ejecuta mem_session_summary con:
- goal: qué se intentaba conseguir
- discoveries: qué se descubrió durante el trabajo
- accomplished: qué se completó realmente
- files: lista de archivos modificados

## Resumen para el usuario

Presenta:
- Lista de cambios realizados
- Estado final (tests, TS, build)
- Próximos pasos sugeridos para la próxima sesión
