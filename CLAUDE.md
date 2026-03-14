# Arkhos (ἀρχός)

Plataforma personal de gestión modular.
**Autor**: Pelayo de la Fuente
**Dominio**: arkhos.pelayodelafuente.es
**Repo**: github.com/Pelayodelafuente/arkhos (privado)

> Referencia maestra del proyecto. Consultar siempre antes de implementar.
> Para detalles de base de datos, fases de ejecución y decisiones arquitectónicas ver `docs/ARCHITECTURE.md`.
> Para estado actual y checklist de progreso ver `docs/STATUS.md`.

---

## REGLA #1 — Documentación siempre actualizada

**Esta regla no es opcional. Es la base de que el proyecto nunca pierda contexto entre sesiones.**

Después de CADA sesión de trabajo, antes del commit final, SIEMPRE debes:

1. **Actualizar `CLAUDE.md`** con cualquier cambio en el estado del proyecto, stack, componentes creados, decisiones tomadas o convenciones nuevas. Este archivo es tu memoria principal — si no está aquí, no existe.
2. **Actualizar `docs/STATUS.md`** con el porcentaje real de cada fase y el detalle de qué está hecho y qué falta.
3. **Actualizar `docs/CHANGELOG.md`** con un registro de lo que se hizo en esta sesión: archivos creados/modificados, decisiones tomadas, bugs corregidos.
4. **Si se crea un módulo nuevo o se modifica la arquitectura**, actualizar `docs/ARCHITECTURE.md`.
5. **NUNCA propongas ejecutar tareas que ya están completadas.** Antes de planificar cualquier acción, LEE `STATUS.md` y `CHANGELOG.md` para saber el estado actual real del proyecto.
6. **Si al empezar una sesión no tienes claro el estado actual**, tu PRIMER paso es leer `CLAUDE.md`, `STATUS.md` y `CHANGELOG.md`. NUNCA asumas el estado — verifícalo.
7. **El commit de documentación va siempre junto con el commit de código**, no por separado. Incluir `docs:` en el mensaje si hay cambios de documentación.

---

## REGLA #2 — Optimización de tokens y eficiencia

Trabaja con la máxima eficiencia de tokens:

1. **Lee antes de escribir.** Entiende qué existe antes de crear o editar. No reescribas archivos enteros cuando solo necesitas cambiar unas líneas.
2. **Ediciones quirúrgicas.** Si un archivo tiene 200 líneas y cambias 5, edita solo esas 5.
3. **No dupliques código.** Antes de crear una función, verifica si ya existe en `src/lib/utils` o en los componentes existentes.
4. **Sin redundancia verbal.** No expliques lo que vas a hacer Y lo que hiciste. Plan → ejecuta → confirma resultado.
5. **Agrupa operaciones similares.** 5 componentes del mismo tipo: analiza el patrón, ejecútalos en secuencia sin repetir el approach.
6. **Confirmaciones concisas.** Qué se hizo + qué archivos + si compila. Sin contexto que ya se conoce.
7. **Planes en formato lista.** Una línea por paso, sin explicar por qué cada paso es necesario a menos que se pregunte.
8. **Sin comentarios obvios en código.** Comenta solo lógica no evidente. El código se autodocumenta con buenos nombres.
9. **Archivos nuevos: contenido completo de una vez. Archivos existentes: ediciones mínimas.**
10. **Dependencias: un solo `npm install` con todos los paquetes necesarios.**

---

## Estado actual

- **Fase 0** (Fundación): ✅ completada — auth, Supabase, deploy en Vercel
- **Fase 1** (Shell): ✅ completada — shell, component library, zustand store
- **Fase 2** (Módulo Proyectos): pendiente
- **Producción**: arkhos.pelayodelafuente.es (deploy automático desde GitHub main)
- **Versiones**: Next.js 16.1.6 · React 19 · Tailwind CSS v4 · TypeScript strict · Zod v4

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript strict (no `any`) |
| Estilos | Tailwind CSS v4 + CSS variables (`@theme inline`) |
| Auth / DB | Supabase (Auth + PostgreSQL + RLS) |
| Estado | Zustand (`zustand` instalado — `src/stores/ui-store.ts`) |
| Cache | Upstash Redis |
| IA | Anthropic (módulo Mercados) |
| Deploy | Vercel (auto-deploy desde main) |

---

## Módulos

| Módulo | Color | Icono Lucide |
|---|---|---|
| Proyectos | `#C4704A` (terracota) | FolderKanban |
| Patrimonio | `#5B8C6A` (verde) | Wallet |
| Gastos | `#4A7A9B` (azul) | Receipt |
| Mercados | `#9B7A4A` (ocre) | TrendingUp |

---

## Brand Identity

### Tipografía
- **Títulos**: DM Serif Display → class `font-heading`
- **Interfaz**: Plus Jakarta Sans → class `font-sans`
- **Datos numéricos**: JetBrains Mono → class `font-mono`

### Paleta de color

**Fondos** (Tailwind tokens)
- Crema: `#FAF7F2` → `bg-background`
- Arena: `#F0EBE1` → `bg-sand`
- Cards: `#FFFFFF` → `bg-card`

**Textos**
- Principal: `#1A1714` → `text-foreground`
- Secundario: `#3D3630` → `text-text-secondary`
- Terciario: `#888780` → `text-text-tertiary`

**Bordes**
- Piedra: `#E2D9CA`, `1px solid` → `border-border`

**Acento**
- Terracota: `#C4704A` → `bg-accent`, `text-accent`, `border-accent`

**Módulos**
- `text-proyectos`, `text-patrimonio`, `text-gastos`, `text-mercados`

### Principios de diseño
- Flat — sin sombras (excepción: modales con `shadow-modal`)
- Sin degradados
- Máximo whitespace
- Iconos: Lucide Icons, line style `1.5–2px`
- Border radius: `rounded-xl` (12px) para cards, `rounded-md` (6px) para inputs/buttons

---

## Componentes implementados

### Layout (`src/components/layout/`)
- `Sidebar` — desktop, 260px, fondo arena, nav con dots de color
- `Topbar` — mobile, logo + hamburguesa
- `MobileDrawer` — panel deslizante con overlay
- `BottomNav` — mobile, fijo abajo, 5 items

### UI (`src/components/ui/`)
- `ArkhosIcon` — isotipo SVG geométrico
- `ArkhosLogo` — icono + wordmark, sizes sm/md/lg
- `Button` — 4 variantes (primary/secondary/ghost/danger), 3 tamaños, loading spinner, forwardRef
- `Card` — contenedor con border-border, rounded-xl, padding sm/md/lg, prop `clickable`
- `Input` — label + error + forwardRef + useId, border-border/focus:border-accent
- `Select` — igual que Input + ChevronDown icon, array de opciones
- `Textarea` — igual que Input, resize-y, forwardRef
- `Badge` — 5 variantes: terracotta/green/blue/gold/gray (bg rgba 12%, text del color)
- `Modal` — overlay blur, shadow-modal, Escape key, click-outside, botón X
- `Toast` — provider con zustand, auto-dismiss 4s, variantes success/error/info
- `Skeleton` — animate-pulse bg-sand, variantes rounded
- `Tooltip` — CSS-only con group/group-hover, posición top/bottom
- `Progress` — barra horizontal, track bg-sand, fill bg-accent, label % opcional en font-mono

### Stores (`src/stores/`)
- `ui-store.ts` — sidebarOpen, toasts[] (auto-dismiss 4s), activeModal
  - `useToast()` — hook con `.success()`, `.error()`, `.info()`

---

## Seguridad

- Supabase Auth con email/password (MFA aplazado)
- **RLS** en todas las tablas
- Proxy (`src/proxy.ts`) protege rutas de dashboard
- Validación de datos con **Zod v4** (`import { z } from "zod/v4"`)
- Variables sensibles en `.env.local` (nunca en código)

---

## Estructura de carpetas

```
src/
  app/
    (auth)/          # login, register, reset-password + actions.ts
    (dashboard)/     # layout.tsx + page.tsx + módulos
    api/             # markets/, ai/, webhooks/ (stubs)
    layout.tsx       # Root layout (fonts, meta PWA)
    globals.css      # CSS variables + @theme inline
  components/
    ui/              # Componentes base reutilizables
    layout/          # Sidebar, Topbar, MobileDrawer, BottomNav
    charts/          # Visualizaciones (vacío)
    modules/         # Componentes por módulo (vacíos)
  lib/
    supabase/        # client.ts, server.ts, types.ts, index.ts
    ai/              # Integración Anthropic (vacío)
    market-data/     # Fetchers APIs financieras (vacío)
    utils/           # Utilidades (vacío)
    hooks/           # Custom hooks (vacío)
  stores/            # Zustand stores (vacío)
  types/             # TypeScript types globales (vacío)
  config/            # Constantes, feature flags (vacío)
  proxy.ts           # Proxy de sesión (antes middleware.ts)

docs/                # ARCHITECTURE.md, CHANGELOG.md, STATUS.md
supabase/
  migrations/        # 001_initial_schema.sql
  functions/         # Edge Functions (vacío)
public/
  favicon.svg        # Isotipo SVG
  icons/             # PWA icons (192, 512)
  manifest.json      # PWA config
```

---

## Convenciones

- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- **Archivos**: kebab-case
- **Componentes**: PascalCase
- **Estilos**: solo Tailwind utilities + CSS variables — cero CSS custom arbitrario
- **TypeScript**: strict, sin `any`
- **Documentación**: todo en `/docs`, mantener `CHANGELOG.md` actualizado
- **Proxy**: Next.js 16 usa `src/proxy.ts` con export `proxy()` (no middleware)
