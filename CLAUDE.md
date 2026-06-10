# Arkhos — Claude Code
# Centro de mando personal de Pelayo
# URL: https://arkhos.pelayodelafuente.es | Repo: github.com/Pelayodelafuente/arkhos

## Estado actual
- Todos los módulos completados: Proyectos, Gastos, Notas, Patrimonio, Mercados, Dashboard
- **Auditoría global 2026-06-10** — ver `AUDITORIA-GLOBAL.md` (raíz). Fases 0-2 ejecutadas:
  Next 16.2.9, DOMPurify, exceljs, tipos DB regenerados (0 `as any`), error boundaries,
  @upstash/ratelimit, fetchWithTimeout, Zod en rutas, historial git purgado, backup semanal DB
- Pendiente del plan: Fase 3 (server fetch en Gastos/Proyectos/Notas, slices stores,
  React Compiler, 28 warnings set-state-in-effect) y Fase 4 (IA v2, ⌘K, PWA, Agenda)
- Próximo: continuar plan de `AUDITORIA-GLOBAL.md` sección 5

## Stack
| Tecnología | Versión | Nota |
|---|---|---|
| Next.js | 16.2.9 | App Router, RSC por defecto |
| TypeScript | ^5 | strict, 0 errores siempre |
| Tailwind CSS | v4 | CSS variables en globals.css |
| Supabase | @supabase/ssr ^0.9.0 | Auth + PostgreSQL + RLS |
| Zustand | ^5.0.11 | estado global UI + módulos |
| Zod | ^4.3.6 | importar de `'zod/v4'` |
| Anthropic SDK | ^0.104.x | IA en 7 API routes |
| TipTap | v3.21.x | editor rich text Notas |
| Framer Motion | ^12.38.0 | animaciones complejas |
| Recharts | ^3.8.0 | gráficos Gastos |
| marked + isomorphic-dompurify | — | markdown → HTML sanitizado |
| exceljs | ^4.4.0 | import Excel Mintos (sustituye a xlsx) |
| pnpm | — | gestor de paquetes (NUNCA npm) |

## Módulos
- Dashboard ✅ — `src/components/modules/dashboard/` — agregado global server-side
- Proyectos ✅ — `src/components/modules/projects/`
- Gastos ✅ — `src/components/modules/expenses/`
- Notas ✅ — `src/components/modules/notes/`
- Patrimonio ✅ — `src/components/modules/patrimonio/` — TR, Indexa, Horos, Crypto, Mintos
- Mercados ✅ — `src/app/(dashboard)/mercados/` — Fases 0-5 + auditoría v1.1

## Reglas activas
Ver: `.claude/rules/reading-protocol.md` — lectura eficiente de archivos
Ver: `.claude/rules/code-conventions.md` — TypeScript, React, Tailwind, commits
Ver: `.claude/rules/security-rules.md` — secrets, RLS, API routes, XSS
Ver: `.claude/rules/session-protocol.md` — inicio/cierre, mem_context, mem_session_summary
Ver: `.claude/rules/supabase-rules.md` — migrations (formato timestamp desde la 053; ver `supabase/migrations/README.md`), queries, RLS, storage

## Agentes disponibles (.claude/agents/)
`architect` · `database` · `frontend` · `security` · `tester` · `performance` · `api`

## Skills disponibles (.claude/skills/)
`inicio` · `cierre` · `audit` · `migration` · `rls-check` · `gen-types` · `pre-commit`
`design` · `component-audit` · `perf-audit` · `tech-debt` · `query-optimize` · `supabase-security`

## Convenciones clave (no negociables)
- **Commits**: Conventional Commits — `feat:` `fix:` `docs:` `refactor:` `chore:`
- **TypeScript**: strict, sin `any`, interfaces para todo, `pnpm exec tsc --noEmit` tras cada cambio
- **Server Components** por defecto. `'use client'` solo para estado/interactividad
- **Imports UI**: siempre desde `'@/components/ui'` (barrel export)
- **RLS** en TODAS las tablas Supabase
- **Zod v4**: importar de `'zod/v4'`
- **CSS**: solo Tailwind utilities + CSS variables de globals.css. Nunca hex hardcodeados en componentes
- **Markdown + HTML**: usar `sanitizeHtml()` de `@/lib/utils/sanitize` antes de `dangerouslySetInnerHTML`

## Memoria (Engram MCP)
- **INICIO**: `mem_context project:"arkhos"` — primer paso siempre
- **TRABAJO**: `mem_save` tras cambios significativos
- **CIERRE**: `mem_session_summary` — OBLIGATORIO

## Agent Teams
Eres COORDINADOR. Delega código real a sub-agentes. Tú: responder preguntas cortas, coordinar, mostrar resúmenes.
SDD: `/sdd-new` → explore+propose · `/sdd-ff` → fast-forward · `/sdd-apply` → implementar · `/sdd-verify` → verificar

<!-- REFERENCIA STACK COMPLETO: Ver docs/ARCHITECTURE.md -->
<!-- REFERENCIA SCHEMA DB: Ver supabase/migrations/ (21 migrations, próxima 022_*) -->
<!-- REFERENCIA CHANGELOG: Ver docs/CHANGELOG.md -->
<!-- REFERENCIA ESTADO DETALLADO: Ver docs/STATUS.md -->
<!-- REFERENCIA COMPONENTES UI: src/components/ui/ — Button, Card, Input, Select, SelectCustom, Textarea, Badge, Modal, ToastProvider, Skeleton, Progress, Tooltip, DropdownMenu, ArkhosIcon, ArkhosLogo -->
<!-- REFERENCIA COLORES: --bg-page #f2ede6 | --accent-terracotta #C4704A | --module-proyectos | --module-patrimonio | --module-gastos | --module-mercados | --module-notas -->
<!-- REFERENCIA TIPOGRAFÍAS: font-heading DM Serif Display | font-sans Plus Jakarta Sans | font-mono JetBrains Mono -->
<!-- REFERENCIA PROYECTOS: docs/modules/PROJECTS.md | src/lib/supabase/projects.ts (27 funciones) | src/stores/projects-store.ts -->
<!-- REFERENCIA SEGURIDAD: MFA TOTP activo | proxy.ts verifica AAL | API routes: getUser() antes de Anthropic SDK -->
<!-- REFERENCIA MCP SETUP: docs/MCP-SETUP.md — instrucciones para instalar Supabase MCP, GitHub MCP, Playwright, Brave Search -->
<!-- REFERENCIA PENDIENTES: docs/PENDING-FIXES.md — backlog priorizado -->
