# Protocolo de sesión — Arkhos

## Inicio de sesión (SIEMPRE)
1. Ejecuta mem_context (Engram) para cargar contexto persistente
2. Lee CLAUDE.md sección "Estado actual" (líneas 1-40 aprox)
3. Ejecuta `git status` para ver cambios pendientes
4. Ejecuta `git log --oneline -5` para contexto reciente
5. Confirma con: "Hola Pelayo, sesión iniciada, ya estoy preparado para trabajar"

## Durante la sesión
- Cada 30-40 minutos o al completar una feature: commit con mensaje descriptivo
- Si el contexto supera el 50%: ejecuta /compact manualmente
- Si cambias de módulo/área: ejecuta /compact para limpiar contexto
- Anota bugs encontrados en docs/PENDING-FIXES.md aunque no los arregles ahora

## Cierre de sesión (SIEMPRE antes de salir)
1. `pnpm exec tsc --noEmit` → 0 errores
2. `pnpm test --run` → todos pasan
3. `pnpm build` → build limpio
4. `git add -A && git commit -m "tipo(scope): descripción"`
5. Actualiza STATUS.md si completaste una tarea
6. Actualiza CHANGELOG.md con los cambios del día
7. Ejecuta mem_session_summary en Engram

## Comandos de referencia rápida
- Ver estado: `git status && pnpm exec tsc --noEmit 2>&1 | tail -5`
- Verificar todo: `pnpm exec tsc --noEmit && pnpm test --run && pnpm build`
- Limpiar contexto: /compact
- Resetear si algo rompió: `git stash && pnpm exec tsc --noEmit`

## Bugfix / ajuste < 50 líneas
1. Actúa directamente
2. `tsc --noEmit` al terminar
3. `mem_save` con el fix

## Feature nueva (módulo completo)
1. Plan Mode SIEMPRE antes de código
2. Esperar aprobación
3. `mem_session_summary` al cerrar

## Refactor
1. Plan Mode obligatorio
2. `tsc --noEmit` antes Y después
3. `next build` debe pasar
4. Actualizar docs si cambian APIs públicas
