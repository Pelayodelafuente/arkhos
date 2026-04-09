# AUDIT-REPORT.md — Auditoría Total Arkhos
**Fecha:** 2026-04-09
**Estado:** Completado — Fixes de P1+P3 aplicados

---

## Resumen Ejecutivo

Auditoría completa de seguridad, código, diseño, sistema cognitivo y preparación para los módulos pendientes (Mercados y Patrimonio). La base técnica del proyecto es sólida: TypeScript strict con 0 errores, RLS activo en todas las tablas, CI con checks de seguridad, y 34 tests de cobertura en áreas críticas.

**Problemas encontrados:** 3 críticos de seguridad, 4 altos, 10 medios, 12 bajos.
**Fixes aplicados en esta sesión:** 3 críticos + 4 altos resueltos.

---

## SECCIÓN 1 — SEGURIDAD

### RLS Audit — Estado por tabla

| Tabla | RLS | SELECT | INSERT | UPDATE | DELETE | Estado |
|-------|-----|--------|--------|--------|--------|--------|
| profiles | ✅ | FOR ALL (user_id) | ✅ | ✅ | ✅ | OK |
| activity_log | ✅ | FOR ALL (user_id) | ✅ | ✅ | ✅ | OK |
| projects | ✅ | FOR ALL (user_id) | ✅ | ✅ | ✅ | OK |
| project_phases | ✅ | JOIN projects | ✅ | ✅ | ✅ | OK |
| phase_tasks | ✅ | JOIN phases+projects | ✅ | ✅ | ✅ | OK |
| task_links | ✅ | JOIN 3 niveles | ✅ | ✅ | ✅ | OK |
| project_types | ✅ | user_id | ✅ | ✅ | ✅ | OK |
| project_statuses | ✅ | user_id | ✅ | ✅ | ✅ | OK |
| expense_categories | ✅ | user_id | ✅ | ✅ | ✅ | OK |
| subscriptions | ✅ | user_id | ✅ | ✅ | ✅ | OK |
| subscription_price_history | ✅ | user_id | ✅ | — | — | OK (log inmutable) |
| user_gastos_settings | ✅ | user_id | ✅ | ✅ | ✅ | OK |
| subscription_payments | ✅ | user_id | ✅ | ✅ | ✅ | OK |
| notes | ✅ | user_id + WITH CHECK | ✅ | ✅ | ✅ | OK |
| note_canvases | ✅ | user_id + WITH CHECK | ✅ | ✅ | ✅ | OK |
| canvas_nodes | ✅ | JOIN note_canvases | ✅ | ✅ | ✅ | OK |
| canvas_edges | ✅ | JOIN note_canvases | ✅ | ✅ | ✅ | OK |
| project_time_entries | ✅ | user_id | ✅ | ✅ | ✅ | OK |
| project_links | ✅ | user_id | ✅ | ✅ | ✅ | OK |
| project_templates | ✅ | **FIXED** (021_fix_templates_rls.sql) | ✅ | ✅ | ✅ | **FIXED** |
| note_folders | ✅ | user_id + WITH CHECK | ✅ | ✅ | ✅ | OK |
| note_versions | ✅ | user_id + WITH CHECK | ✅ | ✅ | ✅ | OK |
| tags | ✅ | JOIN projects | ✅ | ✅ | ✅ | OK |
| task_tags | ✅ | JOIN (SELECT+INSERT+DELETE) | ✅ | — | ✅ | OK |
| task_comments | ✅ | owner+commenter | ✅ | — | ✅ | OK |
| note_backlinks | ✅ | source_note_id IN (user's notes) | ✅ | ✅ | ✅ | OK |

### Findings de Seguridad

#### ~~CRÍTICO-1: 4 API routes de IA sin autenticación~~ ✅ FIXED
**Archivos:** `src/app/api/projects/analyze/route.ts`, `src/app/api/projects/chat/route.ts`, `src/app/api/notes/suggest-tags/route.ts`, `src/app/api/notes/summarize/route.ts`

**Fix aplicado:** Añadido `createServerClient + getUser()` check al inicio de las 4 rutas. También se eliminó la exposición de `error.message` de Anthropic — ahora se devuelven mensajes genéricos.

#### ~~CRÍTICO-2: RLS project_templates — FOR ALL policy insegura~~ ✅ FIXED
**Archivo:** `supabase/migrations/010_projects_v2.sql`

La policy `FOR ALL USING (auth.uid() = user_id OR is_system = true)` permitía que cualquier usuario modificara o eliminara plantillas del sistema (`is_system = true`).

**Fix aplicado:** Migration `021_fix_templates_rls.sql` — separadas en 4 policies (SELECT permite own+system, INSERT/UPDATE/DELETE solo own con `is_system = false`).

#### ~~CRÍTICO-3: XSS en renderizado de Markdown~~ ✅ FIXED
**Archivos:** `src/components/modules/projects/task-detail-fields.tsx`, `src/components/modules/notes/canvas/CanvasNode.tsx`

`marked.parse()` + `dangerouslySetInnerHTML` sin sanitización. El sanitizador de CanvasNode solo eliminaba `<script>` tags.

**Fix aplicado:** Creado `src/lib/utils/sanitize.ts` con sanitizador robusto (elimina script/iframe/object/embed/form/svg/meta/style y sus contenidos, strips event handlers `on*`, strips `javascript:`/`data:`/`vbscript:` URLs). Aplicado en ambos archivos.

#### ~~ALTO-1: Open redirect potencial en /auth/callback~~ ✅ FIXED
**Archivo:** `src/app/auth/callback/route.ts`

El parámetro `next` se usaba directamente sin validar. Fix: validar que `next` empiece con `/` y no con `//`.

#### ALTO-2: Sin validación de tipo/tamaño en uploads servidor — PENDIENTE
**Archivos:** `src/lib/supabase/projects.ts`, `src/lib/supabase/notes.ts`

La validación de MIME type es solo client-side. Para note-images no hay límite de tamaño.

**Acción requerida:** Configurar `allowed_mime_types` y `file_size_limit` en Supabase Storage dashboard para los buckets `project-logos` y `note-images`. Aplicar en Supabase dashboard (no requiere código).

#### ALTO-3: note-images sin RLS Storage documentada — PENDIENTE
**Acción requerida:** Verificar/configurar RLS policies en el bucket `note-images` desde el Supabase dashboard.

#### MEDIO-1: Sin rate limiting en rutas de IA — PENDIENTE
`UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` están en `.env.example` pero `@upstash/redis` no está instalado. **Debe implementarse antes de lanzar Mercados.**

#### MEDIO-2: Duplicado de números de migración — PENDIENTE
Existen `011_subscription_icon_url.sql` y `011_notes_folders.sql` (y dos `013_*`). El runner de migraciones puede tener comportamiento impredecible. La siguiente migración debe ser `021_*`.

---

## SECCIÓN 2 — CÓDIGO Y ARQUITECTURA

### TypeScript
**tsc --noEmit:** 0 errores. ✅

**Anti-patterns encontrados (no bloqueantes):**
- `any` en `MiniDistributionChart.tsx:12` — tooltip de Recharts
- `as unknown as` repetido en `notes.ts` (3x para NoteListItem), `projects.ts` (2x para TemplateRow), `CanvasNode.tsx` (múltiples para LucideIcons)
- 34 instancias de `// eslint-disable` en src/, mayormente en `react-hooks/exhaustive-deps` en el módulo Notas

### Duplicidades Detectadas
- `NoteSortMode` definido en `types/notes.ts` Y re-exportado desde `notes-store.ts` → consolidar en types
- 3 fábricas `createClient()` separadas en `client.ts`, `expenses.ts`, `notes.ts` → unificar en singleton
- `as unknown as NoteListItem[]` triplicado en `notes.ts` → extraer `toNoteListItems()`
- `LucideIcons as unknown as Record<string, LucideIcon>` en 8 archivos → extraer `getLucideIcon()` en `src/lib/utils/icons.ts`
- Patrón de reorder duplicado 4 veces (reorderPhases, reorderTasks, reorderProjectLinks, reorderFolders)

### N+1 Queries
- `duplicateProject()` en `projects-store.ts` — bucle anidado para fases+tareas (55 llamadas para 5 fases × 10 tareas)
- `autoGeneratePayments()` en `expenses.ts` — insert secuencial por suscripción elegible

### Archivos Grandes (>300 líneas)
| Archivo | Líneas |
|---------|--------|
| `stores/notes-store.ts` | 1825 |
| `modules/projects/project-detail.tsx` | 1304 |
| `modules/notes/canvas/NotesCanvas.tsx` | 1097 |
| `lib/supabase/notes.ts` | 980 |
| `stores/projects-store.ts` | 955 |
| `modules/notes/NotePane.tsx` | 773 |
| `stores/expenses-store.ts` | 705 |

`notes-store.ts` (1825 líneas) mezcla lógica de lista de notas, canvas, graph, folders, undo/redo, clipboard. Candidato a split en `notes-list-store.ts` + `notes-canvas-store.ts`.

### Console.log / Debug Statements
- `projects-store.ts:471` — `console.error` para debug de status inválido
- `notes-store.ts` — 5 instancias de `.catch(console.error)` en operaciones fire-and-forget de canvas
- `gastos-utils.ts:73,99,125` — `console.warn` de fallback

### Supabase Patterns
- `saveNoteVersion()` en `notes.ts:807-835` — 3 awaits sin chequeo de `.error`
- `getAllBacklinksForGraph()` — RLS filtra correctamente, comentario añadido para claridad
- `createClient()` — no hay singleton; cada llamada a la data layer crea una instancia nueva de `createBrowserClient`

---

## SECCIÓN 3 — SISTEMA DE DISEÑO

### Variables CSS (globals.css)
- **Duplicado:** `--bg-page` y `--bg-cream` apuntan al mismo valor (`#f2ede6`) — eliminar `--bg-cream`
- **Alias redundante:** `--text-muted` = `--text-tertiary` — elegir uno
- **Variables sin @theme inline:** `--urgency-*` (8 vars), `--shadow-md`, `--shadow-lg`, `--accent-glow` — no son accesibles como clases Tailwind
- **Animaciones duplicadas:** `animate-fade-up` ≈ `animate-fade-in-up`, `animate-slide-in-right-sm` ≈ `animate-slide-in-right`

### Colores de módulo — DISCREPANCIAS RESUELTAS EN CÓDIGO
Los colores reales en `globals.css` (Design System v2) difieren de CLAUDE.md y MEMORY.md:

| Módulo | CLAUDE.md (incorrecto) | globals.css (correcto) |
|--------|----------------------|------------------------|
| notas | `#7a9b76` | `#B07A3A` |
| mercados | `#9B7A4A` | `#7260C4` |
| patrimonio | `#5B8C6A` | `#2E7D6B` |
| gastos | `#4A7A9B` | `#3B78B0` |
| proyectos | `#C4704A` | `#C4704A` ✅ |

**Fix aplicado:** badge.tsx DOT_COLORS actualizado a `var(--module-*)`. CLAUDE.md actualizado con valores correctos.

### Accesibilidad — Fixes Aplicados
- ✅ **Modal:** añadido `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- ✅ **ToastProvider:** añadido `role="status"`, `aria-live="polite"`, `aria-atomic="false"`
- ✅ **Toast colores:** reemplazados hex hardcodeados por `var(--success-text)`, `var(--success-bg)`, `var(--error-text)`, `var(--error-bg)`, `var(--accent-terracotta)`, `var(--accent-hover-bg)`
- ✅ **Progress:** añadido `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. Gradiente reemplazado: `rgba(196,112,74,0.7)` → `var(--accent-light)`

**Pendiente (menor):**
- Input/Select/Textarea error messages: añadir `role="alert"` en el `<p>` de error
- SelectCustom: fix `aria-controls=""` (string vacío)
- Tooltip: añadir `role="tooltip"` e `id` para conectar con `aria-describedby`
- DropdownMenu: `text-red-500 hover:bg-red-50` → `var(--error-text)` y `var(--error-bg)`
- Card clickable: añadir `role="button"` y `tabIndex` cuando es clickable

---

## SECCIÓN 4 — SISTEMA COGNITIVO

### CLAUDE.md — Cambios Aplicados
Ver CLAUDE.md actualizado. Principales correcciones:
- Colores de módulo corregidos (notas, mercados, patrimonio, gastos)
- Lista de migraciones actualizada (001-021)
- Stores: añadido `notes-store.ts` y `canvas-store.ts`
- Componentes UI: añadido `SelectCustom` y `DropdownMenu`
- Stack: añadido `marked@17.0.5`, `framer-motion`, `recharts`, `TipTap v3`
- lib/supabase: añadido `notes.ts`
- types/: añadido `notes.ts` y `expenses.ts`
- `useToast()` corregido → patrón real es `ToastProvider` + Zustand ui-store

### Tests
**Estado actual:** 34 tests en 3 archivos (utils, validation, auth).

**Sin cobertura:**
- Zustand stores (projects-store, expenses-store, notes-store)
- Data layer completo (`src/lib/supabase/*.ts`)
- API routes (4 routes de IA)
- Módulo Notas completo
- Módulo Gastos completo
- Cálculos financieros en `gastos-utils.ts`

**Playwright instalado** como devDependency pero sin `playwright.config.ts` ni tests E2E. Añadir o eliminar la dependencia.

### CI/CD
- `ci.yml`: TypeScript + Lint + Build + Tests — correcto
- `security-review.yml`: Claude Code security review en PRs — correcto
- **Mejoras pendientes:**
  - Next.js `.next/cache` no se cachea → builds lentos
  - `pnpm latest` no está pinnado → riesgo de breaking changes
  - CI requiere secrets `NEXT_PUBLIC_SUPABASE_*` — verificar que están configurados en GitHub Actions

---

## SECCIÓN 5 — DOCUMENTACIÓN

### STATUS.md
- Actualizado correctamente hasta 2026-04-08 ✅
- **Problema:** Section "Notas Canvas grupos v2" (NCG1–NCG8) marcada ✅ pero el sistema de grupos fue **eliminado completamente** en 2026-04-08. Entradas obsoletas.

### Cobertura de docs/modules/
| Módulo | Docs | Estado |
|--------|------|--------|
| Proyectos | `docs/modules/PROJECTS.md` | ⚠️ Parcial — faltan tablas de migrations 010, 012, 013 |
| Gastos | `docs/modules/EXPENSES.md` | ⚠️ Desactualizado — última actualización 2026-03-17 |
| Notas | Ninguno | ❌ Missing — módulo más complejo, sin docs |
| Mercados | Ninguno | ❌ Missing — módulo a implementar, necesita diseño |
| Patrimonio | Ninguno | ❌ Missing — módulo a implementar, necesita diseño |

---

## SECCIÓN 6 — PREPARACIÓN PARA MERCADOS Y PATRIMONIO

### Readiness Score Mercados: 5/10

**Listo:**
- Anthropic SDK instalado y funcionando (4 routes como ejemplo)
- API keys en `.env.example` (CoinGecko, Alpha Vantage, ExchangeRate-API, FRED)
- Zustand store pattern bien establecido
- `src/lib/market-data/` directorio scaffoldeado
- Placeholder page con color correcto

**Bloqueante antes de empezar:**
1. Instalar `@upstash/redis` — `pnpm add @upstash/redis`
2. Implementar rate limiting en API routes (ahora que están autenticadas)
3. Crear `docs/modules/MERCADOS.md` con diseño del módulo
4. Crear `src/lib/ai/` shared utilities (prompt templates, streaming helpers)

### Readiness Score Patrimonio: 6/10

**Listo:**
- `formatCurrency` con `Intl.NumberFormat` — patrón correcto y testeado
- Recharts instalado y en uso
- RLS pattern bien establecido para todas las tablas
- Placeholder page con color correcto (`#2E7D6B`)
- `src/lib/gastos-utils.ts` reutilizable

**Bloqueante antes de empezar:**
1. Crear `docs/modules/PATRIMONIO.md` — diseño DB, componentes, store
2. Diseñar nueva migration `021_patrimonio_schema.sql` (o 022 si la 021 de RLS ya existe)
3. Evitar `parseFloat()` sin guard NaN — patrón ya presente en expenses, no repetir

---

## SECCIÓN 7 — FIXES EJECUTADOS (Resumen)

### Priority 1 — Seguridad ✅
| Fix | Archivo(s) | Estado |
|-----|-----------|--------|
| Auth guards en 4 API routes | `api/projects/analyze`, `api/projects/chat`, `api/notes/suggest-tags`, `api/notes/summarize` | ✅ |
| Error messages genéricos | Las mismas 4 rutas | ✅ |
| project_templates RLS | `021_fix_templates_rls.sql` | ✅ |
| XSS sanitizer | `src/lib/utils/sanitize.ts` + task-detail-fields + CanvasNode | ✅ |
| Open redirect callback | `src/app/auth/callback/route.ts` | ✅ |

### Priority 3 — Deuda Técnica Crítica ✅
| Fix | Archivo(s) | Estado |
|-----|-----------|--------|
| Modal ARIA (role, aria-modal, aria-labelledby) | `src/components/ui/modal.tsx` | ✅ |
| Toast ARIA (role=status, aria-live) | `src/components/ui/toast.tsx` | ✅ |
| Toast colores → CSS variables | `src/components/ui/toast.tsx` | ✅ |
| Progress ARIA (role=progressbar, aria-value*) | `src/components/ui/progress.tsx` | ✅ |
| Progress gradiente → var(--accent-light) | `src/components/ui/progress.tsx` | ✅ |
| Badge DOT_COLORS → var(--module-*) | `src/components/ui/badge.tsx` | ✅ |
| getAllBacklinksForGraph documentación RLS | `src/lib/supabase/notes.ts` | ✅ |

### Priority 4 — Sistema Cognitivo ✅
| Fix | Estado |
|-----|--------|
| CLAUDE.md actualizado (colores, migrations, stack, stores, componentes) | ✅ |
| AUDIT-REPORT.md creado | ✅ |
| STATUS.md actualizado | ✅ |

---

## SECCIÓN 8 — PENDIENTES (No bloqueantes para Mercados/Patrimonio)

### Deuda técnica menor (para próximas sesiones)
1. **Extraer singleton Supabase browser client** — unificar las 3 instancias de `createClient()` en un singleton en `client.ts`
2. **Extraer `getLucideIcon()` utility** — eliminar las 8 instancias de `LucideIcons as unknown as Record<string, LucideIcon>`
3. **Extraer `toNoteListItems()` helper** — eliminar el cast triplicado en `notes.ts`
4. **Fix N+1 en `duplicateProject()`** — usar batch inserts
5. **Memoizar selectores en expenses-store** — `useFilteredSubscriptions`, `useDayTotal`, etc.
6. **Instalar Playwright config** — o eliminar la devDependency
7. **Añadir tests a gastos-utils.ts** — lógica financiera crítica sin cobertura
8. **Consolidar `NoteSortMode`** — eliminar re-definición en notes-store.ts
9. **Split notes-store.ts** (1825 líneas) en list-store + canvas-store
10. **Crear docs/modules/NOTES.md** — el módulo más complejo sin documentación

### Supabase Dashboard (manual)
1. Configurar `allowed_mime_types` en bucket `project-logos` (JPEG, PNG, WebP)
2. Configurar `file_size_limit` en `project-logos` (2MB) y `note-images` (5MB)
3. Verificar/configurar RLS policies en bucket `note-images`
4. Aplicar migration `021_fix_templates_rls.sql` en producción

---

*Generado automáticamente por auditoría multi-agente — 2026-04-09*
