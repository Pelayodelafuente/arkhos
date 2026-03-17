# Módulo Gastos — Plan de Implementación

> **Uso:** Lee este archivo completo antes de empezar. Ejecuta un prompt por sesión, en orden.
> Si el contexto se compacta, escribe: `Lee CLAUDE.md y docs/prompts/GASTOS_PLAN.md y continúa desde el BLOQUE [N]`

---

## Metadata del módulo

| Campo | Valor |
|-------|-------|
| Nombre | Gastos |
| Ruta | `/gastos` |
| Color primario | `#4A7A9B` |
| Posición en sidebar | Debajo de Proyectos |
| Icono sidebar | `CreditCard` (Lucide) |
| Migration | `004_expenses_schema.sql` |
| Inspiración | [Subflow](https://github.com/ridemountainpig/subflow) |

---

## Orden de ejecución

```
PROMPT 1 → Base de datos (Sonnet)
PROMPT 2 → Types + Data Layer + Store (Sonnet)
PROMPT 3 → Componentes UI (Opus)
PROMPT 4 → Polish + Animaciones + Documentación (Sonnet)
```

> ⚠️ La migration SQL del Prompt 1 debes ejecutarla **manualmente** en Supabase Dashboard → SQL Editor. Claude Code genera el archivo, tú lo aplicas.

---

## Paleta de colores del módulo

```css
--expense-blue:      #4A7A9B;   /* primario módulo, mensuales */
--expense-blue-bg:   rgba(74,122,155,0.10);
--expense-gold:      #9B7A4A;   /* anuales */
--expense-gold-bg:   rgba(155,122,74,0.10);
--expense-green:     #5B8C6A;   /* activa */
--expense-green-bg:  rgba(91,140,106,0.10);
--expense-inactive:  #888780;   /* cancelada/pausada */
/* Heredados del brand Arkhos */
--accent:            #C4704A;   /* terracota */
--cream:             #FAF7F2;
--sand:              #F0EBE1;
--stone:             #E2D9CA;
```

## Tipografía

| Fuente | Variable | Uso |
|--------|----------|-----|
| DM Serif Display | `font-serif` | Títulos, nombre del mes, totales grandes |
| Plus Jakarta Sans / DM Sans | `font-sans` | Body, labels, UI general |
| JetBrains Mono | `font-mono` | Importes, fechas, días de cobro, badges |

---

## Diferencias clave Subflow → Arkhos

Subflow usa MongoDB + Clerk + React Context + `startDate.date`.
Arkhos usa Supabase + RLS + Zustand + `billing_day` (día fijo recurrente, no fecha de inicio).

| Concepto Subflow | Adaptación Arkhos |
|---|---|
| `startDate.date` (fecha inicio) | `billing_day` INTEGER (día del mes recurrente) |
| `paymentCycle: 'yearly'` | `cycle: 'annual'` |
| React Context (PreferencesContext) | Campo en Zustand store + toggle UI |
| Server Actions MongoDB | Data layer Supabase `@supabase/ssr` |
| `useSubscription` hook | Selector memoizado en Zustand store |

---

## PROMPT 1 — Base de datos

**Sesión:** Base de datos  
**Modelo recomendado:** Sonnet

```
[ROL]
Actúa como DBA senior especialista en Supabase, PostgreSQL y RLS.

[CONTEXTO]
Lee CLAUDE.md, docs/STATUS.md y docs/CHANGELOG.md antes de empezar.

El módulo Gastos (color #4A7A9B) es el cuarto módulo de Arkhos.
Migrations existentes: 001_initial_schema.sql, 002_projects_schema.sql,
003_projects_refinements.sql. La siguiente es la 004.

[PRE-FLIGHT — verificar antes de empezar]
Comprueba package.json y confirma si existen estas dependencias.
Instala con pnpm las que falten e informa de cada una:

- date-fns           → lógica del calendario (42 celdas, date-fns eachDayOfInterval)
- framer-motion      → animaciones (opcional — usar CSS fallback si no está)
- @ridemountainpig/svgl-react → iconos SVGL de servicios (Netflix, Spotify…)
- recharts           → PieChart de gasto por suscripción
- vaul               → Drawer mobile para popup del calendario
- sonner             → Toasts (puede estar ya instalado)
- zod                → validación modal (verificar versión ≥ 3.23 para zod/v4)

[TAREA]
Crea supabase/migrations/004_expenses_schema.sql con exactamente lo siguiente:

-- ============================================================
-- TABLA: expense_categories
-- ============================================================
-- id           UUID PK DEFAULT gen_random_uuid()
-- user_id      UUID FK profiles NOT NULL
-- name         TEXT NOT NULL  (ej: 'Streaming', 'Herramientas dev')
-- icon         TEXT NOT NULL  (nombre icono Lucide, ej: 'tv', 'code', 'cloud')
-- color        TEXT NOT NULL  (hex, ej: '#E50914')
-- sort_order   INTEGER DEFAULT 0
-- created_at   TIMESTAMPTZ DEFAULT now()
-- updated_at   TIMESTAMPTZ DEFAULT now()
-- RLS: SELECT/INSERT/UPDATE/DELETE solo para auth.uid() = user_id
-- Trigger: auto-update updated_at (copiar patrón de migration 001)

-- ============================================================
-- TABLA: subscriptions
-- ============================================================
-- id            UUID PK DEFAULT gen_random_uuid()
-- user_id       UUID FK profiles NOT NULL
-- category_id   UUID FK expense_categories (nullable, SET NULL on delete)
-- name          TEXT NOT NULL  (ej: 'Netflix', 'Spotify')
-- icon          TEXT NOT NULL  (nombre icono Lucide — para custom services)
-- color         TEXT NOT NULL  (hex del servicio)
-- amount        NUMERIC(10,2) NOT NULL
-- currency      TEXT DEFAULT 'EUR'
-- cycle         TEXT NOT NULL CHECK (cycle IN ('monthly', 'annual'))
-- billing_day   INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 31)
--               NOTA: billing_day es el día RECURRENTE del mes en que se cobra,
--               NO la fecha de inicio. Ej: Netflix cobra el día 1 cada mes → billing_day = 1
-- is_active     BOOLEAN DEFAULT true
-- url           TEXT  (link al servicio, opcional)
-- notes         TEXT  (notas personales, opcional)
-- started_at    DATE  (cuándo empezó la suscripción)
-- cancelled_at  DATE  (si fue cancelada)
-- created_at    TIMESTAMPTZ DEFAULT now()
-- updated_at    TIMESTAMPTZ DEFAULT now()
-- RLS: SELECT/INSERT/UPDATE/DELETE solo para auth.uid() = user_id
-- Trigger: auto-update updated_at

-- ============================================================
-- ÍNDICES
-- ============================================================
-- idx_expense_categories_user  ON expense_categories(user_id)
-- idx_subscriptions_user       ON subscriptions(user_id)
-- idx_subscriptions_category   ON subscriptions(category_id)
-- idx_subscriptions_cycle      ON subscriptions(user_id, cycle)
-- idx_subscriptions_billing    ON subscriptions(user_id, billing_day)
-- idx_subscriptions_active     ON subscriptions(user_id, is_active)

-- ============================================================
-- SEED de categorías iniciales (INSERT con ON CONFLICT DO NOTHING)
-- ============================================================
-- Streaming        (icon: 'tv',         color: '#E50914')
-- Herramientas Dev (icon: 'code',        color: '#6e40c9')
-- Cloud & Hosting  (icon: 'cloud',       color: '#3693F5')
-- Música           (icon: 'music',       color: '#1DB954')
-- Productividad    (icon: 'zap',         color: '#000000')
-- Almacenamiento   (icon: 'hard-drive',  color: '#0572EC')

[VERIFICACIÓN AL TERMINAR]
- El SQL ejecuta sin errores en Supabase SQL Editor
- RLS activo en AMBAS tablas con las 4 políticas (SELECT, INSERT, UPDATE, DELETE)
- Los 6 índices existen
- Los triggers de updated_at funcionan
- Actualiza docs/STATUS.md y docs/CHANGELOG.md
```

---

## PROMPT 2 — Types, Data Layer y Zustand Store

**Sesión:** Lógica de negocio  
**Modelo recomendado:** Sonnet

```
[ROL]
Actúa como ingeniero full-stack senior en TypeScript strict, Supabase y Zustand.

[CONTEXTO]
Lee CLAUDE.md. La migration 004_expenses_schema.sql ya está aplicada en Supabase.
Sigue exactamente los patrones de src/lib/supabase/projects.ts y
src/stores/projects-store.ts como referencia de arquitectura.

[BLOQUE A — src/types/expenses.ts]
Crear con los siguientes tipos (todos exportados, sin 'any', branded types donde aplique):

- ExpenseCategory          → Row completa de expense_categories
- ExpenseCategoryInsert    → campos para INSERT
- ExpenseCategoryUpdate    → Partial para UPDATE
- Subscription             → Row completa de subscriptions
- SubscriptionInsert       → campos para INSERT
- SubscriptionUpdate       → Partial para UPDATE
- SubscriptionWithCategory → Subscription + categoría expandida (join)
- CycleFilter              → 'all' | 'monthly' | 'annual'
- ExpenseSummary           → {
    totalMonthly: number,        // suma suscripciones mensuales
    totalAnnual: number,         // suma suscripciones anuales (precio completo)
    totalMonthlyEstimate: number, // totalMonthly + (totalAnnual / 12)
    countMonthly: number,
    countAnnual: number
  }
- CalendarDay              → {
    date: string,          // formato 'yyyy-MM-dd' (igual que Subflow)
    day: number,           // número del día (1-31)
    isCurrentMonth: boolean,
    weekday: number        // 0=domingo … 6=sábado
  }

[BLOQUE B — src/utils/expenses-calendar.ts]
Adaptar la lógica de Subflow (utils/calendar.ts) al schema de Arkhos.
Subflow usa date-fns con eachDayOfInterval, startOfMonth, endOfMonth, getDay, subDays, addDays.
Generar SIEMPRE 42 celdas (6 filas × 7 columnas) — mismo algoritmo que Subflow.

Funciones a crear:

1. getCalendarDays(year: number, month: number): CalendarDay[]
   → Genera los 42 días del grid (días prev/next mes con isCurrentMonth: false)
   → Usar date-fns igual que Subflow utils/calendar.ts

2. getDayNumber(date: string): number
   → Extrae el número de día de un string 'yyyy-MM-dd'

3. getSubscriptionsForDay(
     subscriptions: SubscriptionWithCategory[],
     day: number,
     year: number,
     month: number
   ): SubscriptionWithCategory[]
   → Filtra suscripciones para un billing_day concreto
   → Edge case (igual que Subflow): si billing_day > días del mes actual,
     la suscripción aparece el último día del mes

[BLOQUE C — src/lib/supabase/expenses.ts]
Adaptar el patrón de data fetching de Subflow (app/actions/action.ts) a Supabase.
Usar createBrowserClient() de @supabase/ssr en todas las funciones.

Funciones requeridas:

// Categorías
getExpenseCategories(userId): Promise<ExpenseCategory[]>
createExpenseCategory(data: ExpenseCategoryInsert): Promise<ExpenseCategory>
updateExpenseCategory(id: string, data: ExpenseCategoryUpdate): Promise<ExpenseCategory>
deleteExpenseCategory(id: string): Promise<void>

// Suscripciones
getSubscriptions(userId: string): Promise<SubscriptionWithCategory[]>
  → join con expense_categories, order by billing_day asc
getActiveSubscriptions(userId: string): Promise<SubscriptionWithCategory[]>
  → filtro is_active = true
getSubscriptionsByDay(userId: string, day: number): Promise<SubscriptionWithCategory[]>
createSubscription(data: SubscriptionInsert): Promise<Subscription>
updateSubscription(id: string, data: SubscriptionUpdate): Promise<Subscription>
deleteSubscription(id: string): Promise<void>
toggleSubscriptionActive(id: string, isActive: boolean): Promise<Subscription>

// Cálculos
getExpenseSummary(userId: string): Promise<ExpenseSummary>

Patrón obligatorio para TODAS las funciones:
- createBrowserClient() de @supabase/ssr
- .select() con join a expense_categories donde aplique
- .order('billing_day') o .order('sort_order') según contexto
- Manejo de error explícito: if (error) throw error
- Tipado estricto en los genéricos de Supabase

[BLOQUE D — src/stores/expenses-store.ts]
Crear siguiendo el patrón de src/stores/projects-store.ts.

Estado:
- subscriptions: SubscriptionWithCategory[]
- categories: ExpenseCategory[]
- cycleFilter: CycleFilter           // 'all' | 'monthly' | 'annual'
- searchQuery: string
- isLoading: boolean
- selectedDay: number | null
- notAmortizeYearly: boolean         // preferencia amortización (feature Subflow)

Acciones (optimistic update + revert en error + Toast):
- fetchSubscriptions(userId)
- fetchCategories(userId)
- addSubscription(data: SubscriptionInsert)
- updateSubscription(id, data: SubscriptionUpdate)
- removeSubscription(id)
- toggleActive(id)
- setCycleFilter(filter: CycleFilter)
- setSearchQuery(query: string)
- setSelectedDay(day: number | null)
- setNotAmortizeYearly(value: boolean)
- addCategory / updateCategory / removeCategory

Selectores derivados memoizados (adaptar lógica de useSubscription.ts de Subflow):
- filteredSubscriptions: combina cycleFilter + searchQuery + is_active
- subscriptionsByDay: Map<number, SubscriptionWithCategory[]>
  → usar getSubscriptionsForDay() de expenses-calendar.ts
- summary: ExpenseSummary
  → si notAmortizeYearly = false: anuales se dividen /12 para totalMonthlyEstimate
  → si notAmortizeYearly = true:  anuales se muestran como precio completo (sin dividir)
  → MISMO cálculo que Subflow useSubscription.ts monthlySpend
- dayTotal(day: number): number → total monetario de un día

Patrón error: revert del estado optimista + useToast().error(mensaje)

[VERIFICACIÓN]
- tsc --noEmit debe pasar sin errores
- Actualiza docs/STATUS.md y docs/CHANGELOG.md
```

---

## PROMPT 3 — Componentes UI

**Sesión:** Interfaz completa  
**Modelo recomendado:** Opus ← importante, este es el prompt más largo

> Si el contexto se compacta durante esta sesión: `Lee CLAUDE.md y docs/prompts/GASTOS_PLAN.md y continúa desde el BLOQUE [N del componente que falta]`

```
[ROL]
Actúa como experto en diseño de producto, UX/UI y desarrollo frontend con
Next.js App Router, TypeScript strict, Tailwind v4 y Zustand.
Eres meticuloso con los detalles visuales y la coherencia de marca.

[CONTEXTO]
Lee CLAUDE.md y .claude/skills/ui/SKILL.md antes de empezar.
Ya están creados:
- src/types/expenses.ts
- src/utils/expenses-calendar.ts
- src/lib/supabase/expenses.ts
- src/stores/expenses-store.ts

Módulo Gastos: color #4A7A9B, iconos Lucide para UI general,
@ridemountainpig/svgl-react para logos de servicios conocidos, cero emojis.

[BLOQUE 1 — src/hooks/useIsMobile.ts]
Copiar literalmente la lógica de Subflow app/hooks/useIsMobile.ts:
- useState + useEffect con resize listener
- lg breakpoint = 1024px (Tailwind lg)
- Retorna boolean isMobile

[BLOQUE 2 — src/data/subscriptionServices.ts]
Adaptar Subflow data/subscriptionServices.ts para Arkhos.
Importar de @ridemountainpig/svgl-react los iconos más comunes:
Netflix, Spotify, YouTube, Apple, Google Drive, GitHub, Figma, Notion,
Vercel, Supabase, Linear, ChatGPT (OpenAI), iCloud, Dropbox, Adobe,
Microsoft, Slack, Discord, Twitch, Amazon, 1Password, Raycast, Railway.
Tipo: { uuid: string; name: string; icon: ComponentType | string }
Exportar como subscriptionServices array.

[BLOQUE 3 — src/components/modules/expenses/ExpenseCalendarCell.tsx]
Componente separado (patrón Subflow calendar-cell.tsx).

Props:
- day: CalendarDay
- subscriptions: SubscriptionWithCategory[]
- isSelected: boolean
- isToday: boolean
- onDayClick: (day: number) => void

Comportamiento:
- Desktop: HoverCard de shadcn/ui (openDelay 150, closeDelay 50)
  → HoverCardContent con ExpensePopupContent
- Mobile: Drawer de vaul
  → DrawerContent con ExpensePopupContent
- Usar useIsMobile() para decidir cuál renderizar

Estilos celda:
- Base: rounded-xl, cursor-pointer, padding p-1, min-h-[48px]
- Con suscripciones: bg rgba(74,122,155,0.04), border rgba(74,122,155,0.12)
- Hoy: bg sand (#F0EBE1), border stone (#E2D9CA), número fw-800 color accent (#C4704A)
- Seleccionada: bg rgba(196,112,74,0.10), border 2px solid #C4704A
- Fuera del mes: opacity-30

Iconos en la celda (PATRÓN SUBFLOW):
- Buscar en subscriptionServices por subscription.icon (serviceId si existe)
- Mostrar máximo 2 iconos + "+N" si hay más (slice(0, 2))
- Cada icono: cuadrado 20px (sm:28px), bg del color del servicio al 10%, radius 4px
- Fallback: inicial del nombre en span si no hay icono SVGL
- Framer Motion: cada icono con initial={{ opacity: 0, y: 10 }}, animate={{ opacity: 1, y: 0 }},
  transition={{ duration: 0.2, ease: 'easeInOut' }} — COPIAR de Subflow calendar-cell.tsx

[BLOQUE 4 — src/components/modules/expenses/ExpensePopupContent.tsx]
Contenido compartido entre HoverCard y Drawer.

Props:
- day: number
- month: number
- year: number
- subscriptions: SubscriptionWithCategory[]

Contenido:
- Header: "N de [Mes]" en DM Serif Display + total del día en JetBrains Mono color accent
  Separado por borderBottom stone
- Lista de suscripciones:
  - Icono SVGL en cuadrado 32px (bg color servicio 10%, radius 8px) — fallback inicial
  - Nombre fw-600 13px
  - Badge "Mensual" (azul #4A7A9B bg) o "Anual" (dorado #9B7A4A bg) debajo del nombre
  - Importe alineado derecha en JetBrains Mono
  - Hover fila: bg sand rgba(240,235,225,0.5)
- max-height con overflow-y-auto + custom scrollbar (patrón Subflow custom-scrollbar)

[BLOQUE 5 — src/components/modules/expenses/ExpenseCalendar.tsx]
Componente principal del calendario. Lee del expenses-store.

- Header: botones ‹ › (Button variant ghost con borde stone, hover accent)
  + nombre del mes en DM Serif Display 22px
  + año en JetBrains Mono 13px color fg4
- Cabecera días: Lun Mar Mié Jue Vie Sáb Dom
  uppercase, font-mono 11px, fg4, letterSpacing 0.06em
- Grid: grid-cols-7, gap-1 sm:gap-2
- Renderizar 42 celdas con getCalendarDays() de expenses-calendar.ts
- Filtrar subscriptions por día con getSubscriptionsForDay()
- Pasar subscriptions filtradas a cada ExpenseCalendarCell
- Estado local: year, month + handlers prevMonth/nextMonth

[BLOQUE 6 — src/components/modules/expenses/ExpenseSummaryCard.tsx]
Card superior con resumen. Usar componente Card existente.

- Eyebrow: texto según cycleFilter del store:
  'all'     → 'GASTO MENSUAL ESTIMADO'
  'monthly' → 'SUSCRIPCIONES MENSUALES'
  'annual'  → 'SUSCRIPCIONES ANUALES (PRORRATEO)'
  Estilo: font-mono 10px, color accent, letterSpacing 0.08em,
  línea terracota a la izquierda (patrón section-eyebrow del brand)
- Total grande: DM Serif Display 28px
  Formatear con Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
  Leer summary.totalMonthlyEstimate del store
- Badges a la derecha:
  'N mensuales' (bg #4A7A9B 10%, color #4A7A9B)
  'N anuales' (bg #9B7A4A 10%, color #9B7A4A)

[BLOQUE 7 — src/components/modules/expenses/ExpenseChartDialog.tsx]
Botón con icono ChartPie (Lucide) → Dialog con PieChart de recharts.
Inspirado en Subflow components/subscription/chart-dialog.tsx.

- PieChart de recharts con Pie + Cell
- Cada Cell usa subscription.color como fill
- Leyenda lateral: icono SVGL (o inicial) + nombre + importe + % del total
- Total en el centro del pie (absolute positioned o label)
- Adaptar calculateMonthsFromStart de Subflow para mostrar gasto acumulado total por suscripción
- Responsive: en mobile Dialog ocupa 90vw

[BLOQUE 8 — src/components/modules/expenses/CycleFilterToggle.tsx]
Pill toggle: Todo / Mensual / Anual.
Reutilizar el patrón visual del view-toggle existente en Arkhos.

- Container: inline-flex, bg sand (#F0EBE1), borderRadius 20px, padding 3px
- Botón activo: bg card (#FFFFFF), color fg, box-shadow sutil, fw-700
- Botón inactivo: transparent, color fg3
- Transición: all 0.2s ease
- Si framer-motion disponible: usar motion.div con layoutId para el indicador activo
- Lee y actualiza cycleFilter en expenses-store

[BLOQUE 9 — src/components/modules/expenses/SubscriptionList.tsx]
Lista completa debajo del calendario.

- Eyebrow 'TODAS LAS SUSCRIPCIONES' con línea terracota
- Card contenedora con border stone, radius 12px
- Cada fila (separadas por borderTop stone):
  - Día de cobro: font-mono 11px fg4, minWidth 24px, alineado derecha
  - Icono SVGL en cuadrado coloreado (32px, misma estética que popup)
  - Nombre: 13px fw-600
  - Badge ciclo: Mensual (azul) o Anual (dorado)
  - Badge estado: si is_active=false → "Pausada" en gris
  - Importe: JetBrains Mono 13px alineado derecha
  - Botón 3-dots → abre SubscriptionModal en modo edición
  - Hover: bg rgba(240,235,225,0.35)
  - Click en la fila: setSelectedDay(billing_day) + scroll to calendar
- Orden: billing_day asc (filteredSubscriptions del store)
- Si framer-motion disponible: stagger 30ms en la entrada de cada fila
- Empty state: icono CreditCard grande + 'Aún no tienes suscripciones'
  en DM Serif Display + botón '+ Añadir suscripción'

[BLOQUE 10 — src/components/modules/expenses/SubscriptionModal.tsx]
Modal create/edit. Usar el componente Modal existente en Arkhos.

- Título: 'Nueva suscripción' o 'Editar [nombre]'
- Campos:
  1. Servicio: ServicesCombobox (ver BLOQUE 11) — autocompleta nombre, uuid e icono SVGL
  2. Nombre*: Input text (pre-relleno desde ServicesCombobox o manual)
  3. Color*: input color con presets del servicio seleccionado o custom
  4. Importe*: Input number step=0.01 con símbolo EUR
  5. Ciclo*: Select → Mensual / Anual
  6. Día de cobro*: Select → 1 al 31
  7. Categoría: Select → lista de categories del store + 'Sin categoría'
  8. URL: Input text opcional, placeholder 'https://...'
  9. Notas: Textarea opcional
  10. Fecha de inicio: Input date opcional
- Validación con Zod v4: import { z } from 'zod/v4'
- Botones: Cancelar (ghost) + Guardar (primary)
- Si es edición:
  - Botón toggle 'Activa' / 'Pausada' con icono Play/Pause
  - Botón Eliminar (danger) con confirmación via Modal de confirmación
- Optimistic update en submit + Toast en error

[BLOQUE 11 — src/components/modules/expenses/ServicesCombobox.tsx]
Adaptar Subflow components/subscription/services-combobox.tsx.

- CommandDialog de shadcn/ui (cmdk) con búsqueda
- Lista de subscriptionServices de src/data/subscriptionServices.ts
- Al seleccionar: autocompleta nombre + uuid + icono en el formulario
- Opción 'Personalizado' para servicios no listados
- Fallback: inicial del nombre en círculo (mismo que Subflow)

[BLOQUE 12 — src/components/modules/expenses/CategoryManager.tsx]
Mini-modal o sección para gestionar categorías.

- Lista de categorías: icono Lucide + nombre + muestra de color
- Botón '+ Nueva categoría' → formulario inline
- Campos: nombre, icono (usar IconPicker existente del módulo Proyectos), color
- Editar/eliminar cada categoría
- Confirmar eliminación si hay suscripciones asociadas (consultar al store)

[BLOQUE 13 — src/components/modules/expenses/ExpenseLegend.tsx]
Leyenda debajo del calendario.

- Dot azul (#4A7A9B) + 'Mensual'
- Dot dorado (#9B7A4A) + 'Anual'
- Mini cuadrado borde stone + número día actual + 'Hoy'
- Font-size 12px, color fg3, centrado, gap 16px

[BLOQUE 14 — src/components/modules/expenses/SmartAddButton.tsx]
Placeholder para feature futura.

- Botón con icono Sparkles (Lucide) + texto 'Smart Add'
- Al clicar: Toast.info('Smart Add estará disponible próximamente')
- Añadir comentario TODO:
  // TODO: Smart Add — el usuario escribe 'Netflix 15.49 mensual día 1'
  // y la API (Gemini/Claude) parsea y autocompleta el formulario.
  // Subflow implementa esto en components/smart-add/ con @google/generative-ai.
  // En Arkhos usar la Claude API desde src/lib/ai/smart-add.ts

[BLOQUE 15 — Página src/app/(dashboard)/gastos/page.tsx]
Server Component.

Toolbar (misma estructura que página de Proyectos):
- Izquierda: CycleFilterToggle
- Centro: Input búsqueda (icono Search, placeholder 'Buscar suscripción...')
            SmartAddButton
- Derecha: botón gestionar categorías (icono Settings)
           ExpenseChartDialog (icono ChartPie)
           Botón '+ Suscripción' (Button primary, icono Plus)

Layout vertical:
1. ExpenseSummaryCard
2. ExpenseCalendar
3. ExpenseLegend
4. SubscriptionList

Responsive:
- Desktop: calendario con celdas aspect-ratio 1
- Mobile: celdas más compactas, Drawer en lugar de HoverCard (useIsMobile)

[BLOQUE 16 — Sidebar]
Añadir 'Gastos' al sidebar existente:
- Icono: CreditCard (Lucide)
- Color del dot: #4A7A9B
- Ruta: /gastos
- Posición: debajo de Proyectos, mismo grupo de módulos

[BLOQUE 17 — Activity Log]
Registrar en activity_log de Supabase:
- subscription_created
- subscription_updated
- subscription_deleted
- subscription_toggled  (activada/pausada)
- category_created
- category_deleted

[CALIDAD OBLIGATORIA]
- tsc --noEmit sin errores
- Sin 'any' implícito en ningún componente
- Todos los componentes usan tokens de globals.css
- Optimistic updates con revert + Toast en error
- Loading states con Skeleton
- Modales de confirmación con Modal (nunca alert() nativo)
- next build debe compilar limpio
- Actualiza docs/STATUS.md, docs/CHANGELOG.md y CLAUDE.md si es necesario
```

---

## PROMPT 4 — Polish, Animaciones y Documentación

**Sesión:** Refinamiento final  
**Modelo recomendado:** Sonnet

```
[ROL]
Actúa como diseñador de producto senior con obsesión por los micro-detalles
y como documentador técnico.

[CONTEXTO]
Lee CLAUDE.md. El módulo Gastos ya funciona (CRUD completo, calendario,
gráfico PieChart). Ahora polish + animaciones + documentación.

[BLOQUE A — Animaciones]

Si framer-motion ESTÁ instalado:
- AnimatePresence en HoverCardContent y DrawerContent
  entrada: opacity 0→1, scale 0.95→1, duration 0.2s ease
  Copiar de Subflow components/subscription/calendar-cell.tsx
- Stagger 30ms en las filas de SubscriptionList al montar
  Copiar patrón de Subflow components/subscription/subscription-list-item.tsx
- Layout animation en las celdas del calendario al cambiar de mes
  usar layoutId={`cell-${day.date}`} en cada ExpenseCalendarCell
- motion.div con layoutId='cycle-indicator' en CycleFilterToggle
  para la transición suave del indicador activo

Si framer-motion NO está instalado:
- @keyframes fadeIn { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
- transition: all 0.2s ease en todos los hovers y selecciones
- NO instalar framer-motion solo para esto

[BLOQUE B — Preferencia de amortización (feature de Subflow)]
Subflow tiene notAmortizeYearlySubscriptions en PreferencesContext.
Adaptar en Arkhos:

- El estado notAmortizeYearly ya está en el expenses-store (Prompt 2)
- Añadir toggle en la toolbar de la página /gastos:
  Toggle switch + label 'Mostrar precio anual completo (no mensualizar)'
- Persistir la preferencia en localStorage con key 'arkhos-expense-amortize'
- El selector summary del store ya respeta esta preferencia (Prompt 2)

[BLOQUE C — Documentación docs/modules/EXPENSES.md]
Crear con las siguientes secciones:

# Módulo Gastos — Documentación técnica
Última actualización: [fecha]

## Visión general
[descripción, URL /gastos, inspiración Subflow, diferencias clave billing_day vs startDate.date]

## Dependencias instaladas
[lista de los 7 paquetes con versión y para qué se usa cada uno]

## Schema de base de datos
[tablas expense_categories y subscriptions con columnas y tipos]

## src/utils/expenses-calendar.ts
[las 3 funciones con firma TypeScript y descripción]

## Data layer (src/lib/supabase/expenses.ts)
[funciones con firma TypeScript]

## Zustand store (src/stores/expenses-store.ts)
[estado, acciones y selectores]

## Componentes (src/components/modules/expenses/)
[los 13 componentes con ruta y responsabilidad]

## Decisiones técnicas
- Por qué billing_day en lugar de startDate.date de Subflow
- Por qué SVGL para iconos de servicios conocidos
- Responsive: HoverCard desktop vs Drawer mobile

## Roadmap
- Smart Add con Claude/Gemini API (parseo natural de suscripciones)
- Alertas de renovación próxima (email/notificación)
- Gráfico de evolución mensual histórico
- Exportación de datos CSV/PDF
- Multi-divisa con conversión automática

[BLOQUE D — Verificación final]
Ejecutar en orden:

1. tsc --noEmit → debe mostrar 0 errores
2. next build   → debe compilar sin errores ni warnings críticos
3. Verificar en browser /gastos:
   ✓ Calendario renderiza 42 celdas (6 filas × 7 columnas)
   ✓ HoverCard en desktop / Drawer en mobile al clicar un día con subs
   ✓ Iconos SVGL se cargan correctamente (Netflix, Spotify...)
   ✓ Fallback de inicial funciona para servicios sin SVGL
   ✓ Gráfico PieChart abre y muestra datos con colores correctos
   ✓ Toggle ciclo (Todo/Mensual/Anual) filtra correctamente
   ✓ CRUD suscripciones: crear, editar, eliminar, toggle activo
   ✓ Amortización: anual/12 en el total estimado mensual
   ✓ Toggle 'no amortizar' cambia los totales en tiempo real
   ✓ Responsive mobile correcto
   ✓ Optimistic updates revierten en caso de error
4. Actualiza docs/STATUS.md, docs/CHANGELOG.md y CLAUDE.md

Commit final:
feat(gastos): implementar módulo completo de gastos inspirado en Subflow
```

---

## Checklist de verificación final

Marca cada punto antes del commit.

### Infraestructura
- [ ] Dependencias instaladas: date-fns, framer-motion, svgl-react, recharts, vaul, sonner, zod ≥3.23
- [ ] Migration 004 aplicada sin errores en Supabase SQL Editor
- [ ] RLS activo en expense_categories Y subscriptions (4 políticas c/u)
- [ ] Los 6 índices existen en Supabase

### Lógica
- [ ] src/types/expenses.ts — sin any, CalendarDay incluido, todos exportados
- [ ] src/utils/expenses-calendar.ts — 3 funciones, genera 42 celdas, edge case último día
- [ ] src/lib/supabase/expenses.ts — todas las funciones con join y tipado estricto
- [ ] src/stores/expenses-store.ts — estado + selectores + amortización

### Hooks y datos
- [ ] src/hooks/useIsMobile.ts — lg breakpoint 1024px
- [ ] src/data/subscriptionServices.ts — lista SVGL con servicios comunes

### Componentes
- [ ] ExpenseCalendarCell.tsx — HoverCard desktop / Drawer mobile
- [ ] ExpensePopupContent.tsx — iconos SVGL, totales, badges ciclo
- [ ] ExpenseCalendar.tsx — 42 celdas, Framer Motion en iconos
- [ ] ExpenseSummaryCard.tsx — totales con amortización, eyebrow reactivo
- [ ] ExpenseChartDialog.tsx — PieChart recharts, colores por suscripción
- [ ] CycleFilterToggle.tsx — 3 opciones, pill, layoutId si Framer disponible
- [ ] SubscriptionList.tsx — SVGL, stagger, click → setSelectedDay
- [ ] SubscriptionModal.tsx — ServicesCombobox SVGL, Zod v4, toggle activo
- [ ] ServicesCombobox.tsx — CommandDialog cmdk con svgl-react
- [ ] CategoryManager.tsx — CRUD, Lucide, confirmar delete con subs
- [ ] ExpenseLegend.tsx — dots azul/dorado, cuadrado hoy
- [ ] SmartAddButton.tsx — placeholder con TODO documentado

### Integración
- [ ] Página /gastos — toolbar completo, layout correcto, responsive
- [ ] Sidebar — CreditCard, dot #4A7A9B, /gastos debajo de Proyectos
- [ ] Activity log — 6 eventos registrados
- [ ] Toggle preferencia 'no amortizar anuales' funcional y persistido

### Calidad
- [ ] tsc --noEmit = 0 errores
- [ ] next build = compilación limpia
- [ ] docs/modules/EXPENSES.md creado y completo
- [ ] docs/STATUS.md + docs/CHANGELOG.md + CLAUDE.md actualizados
- [ ] Commit feat(gastos) ejecutado

---

*Generado para el proyecto Arkhos — Módulo Gastos — Marzo 2026*
*Inspirado en el código fuente de [Subflow](https://github.com/ridemountainpig/subflow)*
