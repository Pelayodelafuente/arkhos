# Arkhos

**Centro de mando personal modular** — una única plataforma para gestionar patrimonio, gastos, notas, proyectos, agenda y mercados financieros, con copiloto de IA integrado.

Construido como proyecto personal para explorar arquitecturas modernas de aplicaciones full-stack: React Server Components, seguridad a nivel de fila (RLS) de extremo a extremo, y experiencias de datos ricas en tiempo real.

> ℹ️ Los datos que se muestran en la aplicación son de ejemplo. Existe un usuario de demostración con datos ficticios en todos los módulos (`supabase/seeds/demo_seed.sql`).

---

## ✨ Módulos

| Módulo | Descripción |
|---|---|
| **Dashboard** | Agregación global server-side de todos los módulos: patrimonio, gasto del mes, mercados y actividad reciente. |
| **Patrimonio** | Cartera multi-plataforma (broker, fondos indexados, gestión value, cripto on-chain, P2P). Snapshots diarios, evolución histórica, comparador vs índices, proyección FIRE. |
| **Gastos** | Suscripciones y gastos recurrentes con presupuestos por categoría, historial de pagos e insights mes a mes. |
| **Notas** | Editor rich-text (TipTap) con tres vistas: Lista, Canvas y **Grafo** de conocimiento con `[[wikilinks]]` y backlinks. |
| **Proyectos** | Gestión de proyectos con fases, tareas kanban, time tracking, tags e integración con GitHub (commits/CI). |
| **Mercados** | Pulso macro global, indicadores en tiempo real, watchlist, alertas y copiloto de análisis con IA. |
| **Cronos (Agenda)** | Calendario mes/semana/día con agregación cross-módulo, auto-scheduling por IA, feed ICS y notificaciones push. |

---

## 🛠 Stack

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router, React Server Components) |
| Lenguaje | **TypeScript** (strict) |
| Estilos | **Tailwind CSS v4** + design tokens (light/dark) |
| Estado | **Zustand** (stores por módulo, en slices) |
| Backend | **Supabase** — PostgreSQL + Auth (MFA) + Row Level Security |
| Validación | **Zod v4** |
| IA | **Anthropic SDK** (tool-use, streaming) |
| Gráficos | **Recharts** · **D3** (grafo de notas) · **React Three Fiber** (sala 3D experimental) |
| Editor | **TipTap v3** |
| Infra | **Vercel** · **Upstash Redis** (cache/rate-limit) · **Sentry** |
| Gestor | **pnpm** |

---

## 🔒 Seguridad

- **Row Level Security en todas las tablas** — cada usuario solo accede a sus propios datos (`auth.uid() = user_id`).
- **Autenticación con MFA** (AAL2) — el middleware verifica el nivel de aseguramiento y fuerza verificación cuando corresponde.
- **Secretos solo en servidor** — las claves sensibles nunca se exponen al cliente; solo `NEXT_PUBLIC_*` llega al browser.
- **Validación de entradas con Zod** y **rate limiting** en las rutas que consumen APIs externas o IA.
- **CSP sin `unsafe-eval`** en producción y cabeceras de seguridad (`X-Frame-Options`, `X-Content-Type-Options`).
- **Sanitización de HTML** (DOMPurify) antes de cualquier render de markdown.

---

## 🏗 Arquitectura

- **Server Components por defecto**; `'use client'` solo donde hace falta interactividad.
- **Data layer aislado** en `src/lib/supabase/[módulo].ts` — nunca se consulta la DB desde componentes.
- **Carga única al login** (`AppDataLoader`): los stores se hidratan una vez y la navegación es instantánea.
- **Migraciones versionadas** en `supabase/migrations/` con RLS, políticas e índices en cada tabla nueva.
- **PWA** instalable con service worker y modo offline.

```
src/
├── app/                 # Rutas (App Router) + API routes
│   ├── (auth)/          # Login, registro, MFA
│   ├── (dashboard)/     # Módulos protegidos
│   └── api/             # Endpoints (IA, mercados, cron, on-chain…)
├── components/
│   ├── modules/         # UI por módulo
│   └── ui/              # Design system (barrel export)
├── lib/                 # Data layer, integraciones, utilidades
└── stores/              # Zustand (estado global + por módulo)
supabase/
├── migrations/          # Schema + RLS versionado
└── seeds/               # Datos de ejemplo (demo_seed.sql)
```

---

## 🚀 Puesta en marcha

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar entorno
cp .env.example .env.local   # rellenar con las claves de tu proyecto Supabase

# 3. Aplicar migraciones (Supabase CLI)
supabase db push

# 4. (Opcional) Cargar datos de ejemplo
#    SELECT seed_demo_for_user('<uuid-de-usuario>');  -- ver supabase/seeds/demo_seed.sql

# 5. Arrancar en desarrollo
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Scripts

| Comando | Acción |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm lint` | ESLint |
| `pnpm test` | Tests (Vitest) |
| `pnpm exec tsc --noEmit` | Chequeo de tipos |

---

## 📄 Licencia

Proyecto personal. Todos los derechos reservados.
