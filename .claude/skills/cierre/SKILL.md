---
name: cierre
description: Protocolo de cierre de sesion. Activar cuando el usuario dice "terminar", "cerrar sesion", "hasta manana", "acabar" o al finalizar el trabajo del dia.
---
# Protocolo de cierre de sesion - Arkhos

## Verificacion final (obligatorio)

```bash
echo "=== VERIFICACION FINAL ==="
pnpm exec tsc --noEmit && echo "TypeScript OK" || echo "TypeScript ERRORS"
pnpm test --run 2>&1 | tail -3
pnpm build 2>&1 | tail -5
```

Si alguna verificacion falla: PARA y corrige antes de continuar.

## Commit de cierre

```bash
git status
git add -A
git log --oneline -1
```

Genera mensaje de commit descriptivo: tipo(scope): resumen de lo hecho

## Actualizar documentacion

1. Actualiza STATUS.md - marca tareas completadas
2. Actualiza CHANGELOG.md - añade entrada con fecha y cambios
3. Actualiza PENDING-FIXES.md - abre/cierra pendientes

## Guardar en Engram (OBLIGATORIO)

Ejecuta mem_session_summary con:
- goal: que se intentaba conseguir
- discoveries: que se descubrio
- accomplished: que se completo
- files: lista de archivos modificados

## Resumen para el usuario

Presenta lista de cambios, estado final y proximos pasos.
