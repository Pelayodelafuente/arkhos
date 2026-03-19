# Arkhos — CLAUDE.md
# Centro de mando personal de Pelayo
# URL: https://arkhos.pelayodelafuente.es
# Repo: github.com/Pelayodelafuente/arkhos

## Estado actual
- Fases 0, 1, 2 completadas al 100%
- Próximo: Fase 3 (Módulo Mercados)
- Ver STATUS.md para checklist detallado
- Ver CHANGELOG.md para historial de decisiones

---

## Stack (versiones exactas)
- **Next.js 16.1.6** (App Router, RSC por defecto)
- **TypeScript ^5** strict mode (0 errores tsc siempre)
- **Tailwind CSS v4** (CSS variables en globals.css via `@theme inline`)
- **Supabase** Auth + PostgreSQL + RLS — `@supabase/ssr ^0.9.0`
- **Zustand ^5.0.11** (estado global UI + módulos)
- **Lucide React ^0.577.0** (iconos — cero emojis en UI)
- **Zod ^4.3.6** (importar desde `'zod/v4'`)
- **@dnd-kit/core ^6.3.1** + **@dnd-kit/sortable ^10.0.0** drag & drop
- **pnpm** como gestor de paquetes

---

## Estructura crítica

```
src/
  app/
    (auth)/          → login, register, reset-password, verify-mfa
    (dashboard)/     → layout compartido + módulos + settings/security
  components/
    ui/              → component library (barrel: ui/index.ts)
    layout/          → Sidebar.tsx, topbar.tsx, mobile-drawer.tsx, bottom-nav.tsx, NavigationProgress.tsx
    modules/         → proyectos/, expenses/, (markets/, patrimonio/ — próximos)
  lib/
    supabase/        → client.ts, server.ts, types.ts, projects.ts, activity.ts, expenses.ts
    animations.ts    → constantes de animación (easings, duraciones, stagger)
  stores/            → ui-store.ts, projects-store.ts, expenses-store.ts
  types/             → projects.ts
  proxy.ts           → middleware de sesión (exporta proxy(), no middleware.ts)
supabase/migrations/ → 001_initial, 002_projects, 003_refinements
docs/                → ARCHITECTURE.md, CHANGELOG.md, STATUS.md
docs/modules/        → PROJECTS.md
```

---

## Convenciones (no negociables)

- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)
- **Ramas**: `feat/nombre` → PR → `main` (branch protection activa)
- **Archivos**: kebab-case. Componentes: PascalCase
- **TypeScript**: strict, sin `any`, interfaces para todo
- **CSS**: solo Tailwind utilities + CSS variables de `globals.css`
- **Server Components** por defecto. `'use client'` solo para estado/interactividad
- **Imports UI**: siempre desde `'@/components/ui'` (barrel export)
- **Server Actions** para mutations. No API routes para CRUD básico
- **RLS** en TODAS las tablas Supabase. Verificar en cada migration
- **Zod v4**: importar de `'zod/v4'`. Validar en cliente Y servidor

---

## Paleta de colores (CSS variables — globals.css)

```
Fondos:    --bg-cream #FAF7F2 | --bg-sand #F0EBE1 | --bg-card #FFFFFF
Textos:    --text-primary #1A1714 | --text-secondary #3D3630 | --text-tertiary #888780
Bordes:    --border-stone #E2D9CA (1px solid)
Acento:    --accent-terracotta #C4704A
Módulos:   proyectos #C4704A | patrimonio #5B8C6A | gastos #4A7A9B | mercados #9B7A4A
Sombras:   --shadow-modal 0 4px 20px rgba(26,23,20,0.08) — solo modales
```

Tailwind tokens: `bg-background`, `bg-sand`, `bg-card`, `bg-accent`, `text-foreground`,
`text-text-secondary`, `text-text-tertiary`, `border-border`, `text-accent`.

Principios: flat (sin sombras), sin degradados, máximo whitespace.
`rounded-xl` cards · `rounded-md` inputs/buttons.

### Animaciones (CSS variables — globals.css)

```
Easings:    --ease-out-expo cubic-bezier(0.16,1,0.3,1) | --ease-spring cubic-bezier(0.34,1.56,0.64,1)
Duraciones: --transition-fast 150ms | --transition-normal 250ms | --transition-slow 400ms
```

Clases CSS disponibles: `animate-fade-in-up`, `animate-fade-in`, `animate-scale-in`,
`animate-slide-in-right`, `animate-slide-out-right`, `dot-pulse-active`.
Constantes TS: importar desde `@/lib/animations` (EASE_OUT_EXPO, DURATION_NORMAL, etc.).
Regla: solo animar `transform` y `opacity`. Respetar `prefers-reduced-motion` siempre.

---

## Tipografías

- `font-heading` — DM Serif Display (títulos/display)
- `font-sans` — Plus Jakarta Sans (interfaz/texto)
- `font-mono` — JetBrains Mono (datos/código/números)

---

## Componentes UI disponibles

Importar desde `'@/components/ui'`:

```
Button        variant: primary|secondary|ghost|danger  size: sm|md|lg  loading?
Card          padding: sm|md|lg  clickable?
Input         label  error  forwardRef  useId
Select        label  error  options: {value,label}[]
Textarea      label  error  forwardRef  resize-y
Badge         variant: terracotta|green|blue|gold|gray
Modal         title  onClose — Escape + click-outside + X
Toast         useToast() → .success(msg) .error(msg) .info(msg)
Skeleton      animate-pulse  className para dimensiones
Progress      value: 0-100
Tooltip       CSS-only  posición: top|bottom
ArkhosIcon    SVG isotipo geométrico
ArkhosLogo    size: sm|md|lg
```

---

## Módulo Proyectos — puntos clave

- **Data layer**: `src/lib/supabase/projects.ts` — 27 funciones tipadas
- **Store**: `src/stores/projects-store.ts` — optimistic updates + rollback + Toast
- **Canvas store**: `src/stores/canvas-store.ts` — posiciones ventanas, zoom, selección, localStorage
- **Selectores**: `useFilteredProjects()`, `useProjectsByStatus(statuses[])`
- **Tipos/estados**: dinámicos por usuario (`project_types`, `project_statuses`)
- **Drag & drop**: `reorderPhasesAction`, `reorderTasksAction` en store
- **Logo**: Supabase Storage bucket `project-logos` — `{userId}/{projectId}.{ext}`
- **Búsqueda**: debounce 300ms, filtro name/stack/tags, highlight `<mark>`
- **Canvas**: `/proyectos` renderiza `ProjectCanvas` — 5 ventanas arrastrables con Framer Motion
- **API Routes IA**: `/api/projects/analyze` + `/api/projects/chat` — streaming Anthropic SDK
- **Docs**: `docs/modules/PROJECTS.md` — schema, data layer, store, componentes

---

## Seguridad

- Secretos: solo `.env.local` + Vercel env vars. Nunca en código
- Variables sensibles: `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **RLS activo** en todas las tablas. Verificar tras cada migration
- Server Actions usan `createServerClient` de `@supabase/ssr`
- **MFA TOTP activo** — `src/proxy.ts` verifica AAL: `aal1→aal2` redirige a `/verify-mfa`
- No exponer `user_id` en URLs públicas

---

## Flujo de trabajo

**Bugfix / ajuste < 50 líneas**
1. Actúa directamente
2. `tsc --noEmit` al terminar
3. `mem_save` con el fix

**Feature nueva (módulo completo)**
1. Plan Mode SIEMPRE antes de código
2. Esperar aprobación
3. `mem_session_summary` al cerrar

**Refactor**
1. Plan Mode obligatorio
2. `tsc --noEmit` antes Y después
3. `next build` debe pasar
4. Actualizar docs si cambian APIs públicas

---

## Memoria (Engram MCP)

**INICIO SESIÓN** → `mem_context project:"arkhos"` — primer paso siempre.
**TRABAJO SIGNIFICATIVO** → `mem_save` inmediatamente.
**TRAS COMPACTACIÓN** → `mem_context` antes de continuar.
**FIN SESIÓN** → `mem_session_summary` es OBLIGATORIO.

Formato `mem_save.content`:
```
**What**: qué se hizo
**Why**: por qué / qué problema resuelve
**Where**: archivos afectados
**Learned**: gotchas, decisiones, recordar para el futuro
```

Tipos: `decision` · `bugfix` · `pattern` · `config` · `integration`
Proyecto siempre: `"project": "arkhos"`

---

## Skills activos

Skills del proyecto en `.claude/skills/`:

| Skill | Trigger | Qué aporta |
|-------|---------|-----------|
| `arkhos-dev` | TODA tarea de desarrollo | Convenciones, estructura, naming, commits, RULE #1 (docs) |
| `ui` | Componentes UI, diseño visual | Componentes disponibles, tokens, patrones |
| `supabase` | DB, auth, migrations, RLS | Cliente correcto por contexto, RLS policies, MFA |

Plugins instalados: `frontend-design`, `skill-creator`, `simplify`, `loop`.
(`feature-dev` desinstalado — sustituido por el suite `sdd-*`)

### Prioridad de skills UI

Cuando `frontend-design` y `ui` entren en conflicto:
- **`ui` tiene prioridad absoluta** — es el design system específico de Arkhos (tokens, componentes, paleta).
- `frontend-design` aporta criterio estético genérico y se aplica solo donde `ui` no dicta nada concreto.

### Regla de auto-mejora

- Cuando detectes un patrón repetido 2+ veces en la misma sesión, sugiere crear un skill.
- Al final de cada sesión, evalúa si algún skill existente necesita actualizarse con nuevos patrones descubiertos.
- Si un skill no se activa cuando debería, ajusta su `description` para mejorar el triggering.

---

## Agent Teams — Orquestador SDD

Eres COORDINADOR, no ejecutor. Delegas TODO el trabajo real a sub-agentes via Agent tool.

### Reglas de delegación (siempre activas)

1. **NUNCA hagas trabajo real inline.** Leer código, escribir código, analizar arquitectura → delegar.
2. **Puedes:** responder preguntas cortas, coordinar sub-agentes, mostrar resúmenes, pedir decisiones.
3. **Self-check:** "¿Voy a leer/escribir código o analizar? Si sí → delegar."
4. **Por qué:** Tú eres contexto siempre-cargado. Cada token que consumes sobrevive toda la conversación. Sub-agentes obtienen contexto fresco y devuelven solo el resumen.

### Escalado de tareas

- **Pregunta simple** → responder si sabes. Si no, delegar.
- **Tarea pequeña** (1 archivo, quick fix) → sub-agente general.
- **Feature/refactor sustancial** → sugerir SDD: `/sdd-new {nombre}`.

### Comandos SDD

- `/sdd-init` → inicializar proyecto
- `/sdd-explore <topic>` → analizar área del codebase
- `/sdd-new <change>` → explore + propose
- `/sdd-continue [change]` → siguiente artefacto en la cadena
- `/sdd-ff [change]` → propose → spec → design → tasks (fast-forward)
- `/sdd-apply [change]` → implementar en batches
- `/sdd-verify [change]` → verificar implementación
- `/sdd-archive [change]` → archivar cambio completado

### Grafo de dependencias

```
proposal -> specs --> tasks -> apply -> verify -> archive
             ^
             |
           design
```

### Contexto de sub-agentes (modo engram)

- **Artifact store**: `engram` — siempre. Proyecto: `"arkhos"`.
- **Topic keys**: `sdd-init/arkhos`, `sdd/{change}/explore`, `sdd/{change}/proposal`, `sdd/{change}/spec`, `sdd/{change}/design`, `sdd/{change}/tasks`, `sdd/{change}/apply-progress`, `sdd/{change}/verify-report`.
- **Lectura**: orchestrator busca en engram y pasa contexto al sub-agente.
- **Escritura**: sub-agente guarda descubrimientos/decisiones vía `mem_save`.
- **Skills**: incluir en prompt del sub-agente: `"Check skills: mem_search(query: 'skill-registry', project: 'arkhos')"`

### Respuesta de sub-agentes

Cada sub-agente debe devolver: `status`, `executive_summary`, `artifacts` (IDs), `next_recommended`, `risks`.

### Recuperación

Si se pierde estado (compactación): `mem_search(query: "{topic_key}", project: "arkhos")` → `mem_get_observation(id)`.

---

## Protocolo de cierre de sesión (OBLIGATORIO — no opcional)

Al terminar cualquier sesión de trabajo, en este orden exacto:

1. `tsc --noEmit` → debe pasar con 0 errores
2. `next build` → debe compilar sin errores
3. `mem_session_summary` en Engram con:
   - goal: qué se intentaba conseguir
   - discoveries: qué se descubrió durante el trabajo
   - accomplished: qué se completó realmente
   - files: lista de archivos modificados
4. Actualizar `docs/CHANGELOG.md`:
   - Si es cierre de tarea: añadir bullet bajo la fase activa
   - Si es cierre de fase: añadir sección de cierre completa
5. Actualizar `docs/STATUS.md`:
   - Marcar como ✅ las tareas completadas
   - Actualizar el porcentaje de la fase activa
6. Commit con Conventional Commits:
   - `feat:` para features nuevas
   - `fix:` para correcciones
   - `docs:` para documentación
   - `chore:` para infraestructura

Si el contexto se compacta durante la sesión:
→ Llama `mem_context` inmediatamente antes de continuar
→ No continúes sin recuperar el contexto
