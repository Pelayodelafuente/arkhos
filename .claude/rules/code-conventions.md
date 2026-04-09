# Convenciones de código — Arkhos

## TypeScript
- strict mode: no `any`, no `as unknown`, no `@ts-ignore`
- Interfaces para todo. Type aliases solo para unions.
- Si necesitas hacer `as Type`, es señal de que el tipo está mal definido
- Zod v4 para validación de inputs externos — importar de `'zod/v4'`
- Siempre verifica con `pnpm exec tsc --noEmit` tras cambios

## React / Next.js
- App Router: Server Components por defecto, Client solo cuando se necesita estado/interactividad
- Marca `"use client"` solo cuando sea estrictamente necesario
- No uses `useEffect` para fetching — usa Server Components o SWR/React Query
- Zustand stores: no pongas lógica de negocio en componentes — ponla en el store
- Nombres: PascalCase para componentes, kebab-case para archivos

## Tailwind CSS v4
- Solo utilities de Tailwind. Cero CSS custom suelto fuera de globals.css.
- Variables CSS del brand en globals.css — nunca hardcodees colores hex en componentes
- Si necesitas un valor que no existe en Tailwind, define una CSS variable

## Supabase
- Todas las queries en `src/lib/supabase/[módulo].ts` — nunca en componentes
- Siempre tipado con los tipos generados de la DB
- RLS obligatorio en todas las tablas. Verificar con skill `rls-check`.
- Usa `createServerClient` en Server Components, `createBrowserClient` en Client

## Estructura de commits
- Formato: `type(scope): descripción en minúsculas`
- Types: feat, fix, refactor, docs, chore, style, perf, test, security
- Ejemplos: `feat(mercados): añadir widget de precio en tiempo real`
- Nunca hagas commit sin pasar tsc + tests + build

## Imports
- Imports absolutos con `@/` (configurado en tsconfig)
- Orden: 1) React/Next, 2) librerías externas, 3) internos con @/, 4) tipos
- Sin imports circulares
- UI siempre desde `'@/components/ui'` (barrel export)
