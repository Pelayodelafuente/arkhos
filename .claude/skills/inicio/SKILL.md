---
name: inicio
description: Protocolo completo de inicio de sesión para Arkhos. Activar SIEMPRE al comenzar una nueva sesión de trabajo, cuando el usuario dice "empezar", "iniciar sesión", "comenzar" o "buenos días". Carga contexto completo del proyecto.
---

# Protocolo de inicio de sesión — Arkhos

## Ejecutar en orden

```bash
echo "=== GIT STATUS ==="
git status --short
git log --oneline -5

echo "=== TYPESCRIPT ==="
pnpm exec tsc --noEmit 2>&1 | tail -5

echo "=== TESTS ==="
pnpm test --run 2>&1 | tail -3

echo "=== PENDING FIXES ==="
cat docs/PENDING-FIXES.md 2>/dev/null | head -20 || echo "Sin pendientes registrados"
```

Luego:
1. Ejecuta mem_context (Engram) para cargar contexto persistente
2. Lee STATUS.md líneas 1-30 (estado actual de fases)
3. Presenta al usuario: estado actual, tests, pendientes y sugerencia de próximos pasos
4. Confirma con: "Hola Pelayo, sesión iniciada, ya estoy preparado para trabajar"

## Contexto del proyecto
- Stack: Next.js 16 App Router, TypeScript strict, Tailwind v4, Supabase, Zustand v5
- Módulos completados: Auth ✅, Layout ✅, Proyectos ✅, Gastos ✅, Notas ✅
- Módulos pendientes: Mercados (siguiente), Patrimonio
- 21 migrations en supabase/migrations/ (próxima: 022_*)
- Deploy: arkhos.pelayodelafuente.es (Vercel)
