# Módulo Gastos — Documentación técnica

Última actualización: 2026-03-17

---

## Visión general

El módulo Gastos (`/gastos`) permite al usuario registrar y visualizar sus suscripciones y gastos recurrentes a través de un calendario mensual interactivo. Está inspirado en [Subflow](https://github.com/ridemountainpig/subflow), adaptado al stack de Arkhos (Supabase + Zustand + Next.js App Router).

**Diferencia clave respecto a Subflow**: Subflow usa `startDate.date` (fecha de inicio de la suscripción) para mostrar el día de cobro en el calendario. Arkhos usa `billing_day` (INTEGER 1-31), que representa el día recurrente del mes en que se cobra el servicio — independiente de cuándo empezó la suscripción. Esta decisión simplifica la lógica del calendario y permite que una suscripción iniciada cualquier día siempre aparezca en el mismo día del mes en el que se cobra.

**Otras adaptaciones**:
- Subflow usa MongoDB + Clerk + React Context. Arkhos usa Supabase + RLS + Zustand.
- El `PreferencesContext` de Subflow (para `notAmortizeYearlySubscriptions`) se implementa como campo en el Zustand store + toggle en UI, persistido en `localStorage`.
- Las Server Actions de MongoDB se sustituyen por el data layer `@supabase/ssr` con `createBrowserClient`.
- `useSubscription` hook de Subflow → selectores memoizados en el store.

---

## Dependencias instaladas

| Paquete | Versión | Uso |
|---|---|---|
| `date-fns` | ^4.1.0 | Utilidades de fecha: `eachDayOfInterval`, `startOfMonth`, `endOfMonth`, `getDay`, `getDaysInMonth`, `format`. Genera las 42 celdas del grid del calendario. |
| `framer-motion` | ^12.38.0 | Animaciones: entrada de iconos en `ExpenseCalendarCell` (opacity+y), stagger en `SubscriptionList`, layout animation con `layoutId` en `CycleFilterToggle`, hover card fade/scale. |
| `@ridemountainpig/svgl-react` | ^1.0.15 | Iconos SVG de alta calidad para 22 servicios conocidos (Netflix, Spotify, GitHub, etc.). Los iconos se buscan por `serviceId` en `src/data/subscriptionServices.ts`. |
| `recharts` | ^3.8.0 | PieChart en `ExpenseChartDialog`: distribución de gasto por suscripción con colores del servicio. |
| `vaul` | ^1.1.2 | Drawer nativo mobile en `ExpenseCalendarCell`: reemplaza el HoverCard de desktop en dispositivos táctiles (`useIsMobile()`). |
| `sonner` | ^2.0.7 | Toasts (instalado en el proyecto, el módulo usa el sistema de toasts propio via `useUIStore`). |
| `zod` | ^4.3.6 | Validación de formulario en `SubscriptionModal`. Importar desde `'zod/v4'`. |

---

## Schema de base de datos

### Migration: `supabase/migrations/004_expenses_schema.sql`

#### Tabla `expense_categories`

| Columna | Tipo | Constraints |
|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() |
| `user_id` | UUID | NOT NULL, FK profiles(id) ON DELETE CASCADE |
| `name` | TEXT | NOT NULL — ej: 'Streaming', 'Herramientas dev' |
| `icon` | TEXT | NOT NULL — nombre icono Lucide, ej: 'tv', 'code', 'cloud' |
| `color` | TEXT | NOT NULL — hex, ej: '#E50914' |
| `sort_order` | INTEGER | DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now(), auto-actualizado por trigger |

RLS: 4 políticas (SELECT / INSERT / UPDATE / DELETE) — solo `auth.uid() = user_id`.

#### Tabla `subscriptions`

| Columna | Tipo | Constraints |
|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() |
| `user_id` | UUID | NOT NULL, FK profiles(id) ON DELETE CASCADE |
| `category_id` | UUID | FK expense_categories(id) ON DELETE SET NULL, nullable |
| `name` | TEXT | NOT NULL — ej: 'Netflix', 'Spotify' |
| `icon` | TEXT | NOT NULL — serviceId de subscriptionServices o nombre Lucide para custom |
| `color` | TEXT | NOT NULL — hex del color del servicio |
| `amount` | NUMERIC(10,2) | NOT NULL |
| `currency` | TEXT | DEFAULT 'EUR' |
| `cycle` | TEXT | NOT NULL, CHECK IN ('monthly', 'annual') |
| `billing_day` | INTEGER | NOT NULL, CHECK BETWEEN 1 AND 31 — día recurrente de cobro |
| `is_active` | BOOLEAN | DEFAULT true |
| `url` | TEXT | nullable — link al servicio |
| `notes` | TEXT | nullable — notas personales |
| `started_at` | DATE | nullable — cuándo empezó la suscripción |
| `cancelled_at` | DATE | nullable — si fue cancelada |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now(), auto-actualizado por trigger |

RLS: 4 políticas (SELECT / INSERT / UPDATE / DELETE) — solo `auth.uid() = user_id`.

**Índices**: `idx_expense_categories_user`, `idx_subscriptions_user`, `idx_subscriptions_category`, `idx_subscriptions_cycle`, `idx_subscriptions_billing`, `idx_subscriptions_active`.

---

## `src/utils/expenses-calendar.ts`

Genera el grid del calendario y calcula qué suscripciones caen en cada día. Semana europea: Lunes → Domingo.

```typescript
// Genera las 42 celdas (6 filas × 7 columnas) del calendario.
// Los días fuera del mes tienen isCurrentMonth: false.
// month es 1-based (1=enero … 12=diciembre).
function getCalendarDays(year: number, month: number): CalendarDay[]

// Extrae el número de día de un string 'yyyy-MM-dd'.
// Ejemplo: '2026-03-17' → 17
function getDayNumber(date: string): number

// Filtra suscripciones activas para un billing_day concreto.
// Edge case (igual que Subflow): si billing_day > días del mes actual,
// la suscripción aparece el último día del mes.
function getSubscriptionsForDay(
  subscriptions: SubscriptionWithCategory[],
  day: number,
  year: number,
  month: number
): SubscriptionWithCategory[]
```

---

## Data layer (`src/lib/supabase/expenses.ts`)

Todas las funciones usan `createBrowserClient()` de `@supabase/ssr`. Lanzan `ExpensesError` en caso de error (nunca devuelven `null` silencioso).

```typescript
// Categorías
getExpenseCategories(userId: string): Promise<ExpenseCategory[]>
createExpenseCategory(data: ExpenseCategoryInsert): Promise<ExpenseCategory>
updateExpenseCategory(id: string, data: ExpenseCategoryUpdate): Promise<ExpenseCategory>
deleteExpenseCategory(id: string): Promise<void>

// Suscripciones — todas las queries incluyen join a expense_categories
getSubscriptions(userId: string): Promise<SubscriptionWithCategory[]>
  // → join expense_categories, order by billing_day asc
getActiveSubscriptions(userId: string): Promise<SubscriptionWithCategory[]>
  // → filtro is_active = true
getSubscriptionsByDay(userId: string, day: number): Promise<SubscriptionWithCategory[]>
createSubscription(data: SubscriptionInsert): Promise<Subscription>
updateSubscription(id: string, data: SubscriptionUpdate): Promise<Subscription>
deleteSubscription(id: string): Promise<void>
toggleSubscriptionActive(id: string, isActive: boolean): Promise<Subscription>

// Cálculos
getExpenseSummary(userId: string): Promise<ExpenseSummary>
  // → calcula totales sobre activas (sin respetar notAmortizeYearly — eso es UI)
```

---

## Zustand store (`src/stores/expenses-store.ts`)

### Estado

```typescript
subscriptions: SubscriptionWithCategory[]
categories: ExpenseCategory[]
cycleFilter: CycleFilter           // 'all' | 'monthly' | 'annual'
searchQuery: string
isLoading: boolean
selectedDay: number | null
notAmortizeYearly: boolean         // si true: anuales se muestran como precio completo sin /12
```

### Acciones

```typescript
fetchSubscriptions(userId: string): Promise<void>
fetchCategories(userId: string): Promise<void>
addSubscription(data: SubscriptionInsert): Promise<void>
editSubscription(id: string, data: SubscriptionUpdate): Promise<void>
removeSubscription(id: string): Promise<void>
toggleActive(id: string): Promise<void>
setCycleFilter(filter: CycleFilter): void
setSearchQuery(query: string): void
setSelectedDay(day: number | null): void
setNotAmortizeYearly(value: boolean): void
addCategory(data: ExpenseCategoryInsert): Promise<void>
editCategory(id: string, data: ExpenseCategoryUpdate): Promise<void>
removeCategory(id: string): Promise<void>
```

Todas las acciones de mutación usan **optimistic update con rollback**: el estado se actualiza optimistamente antes de la llamada a Supabase; si falla, se revierte al estado anterior y se muestra un Toast de error.

### Selectores exportados

```typescript
// Filtra por cycleFilter + searchQuery (solo activas)
useFilteredSubscriptions(): SubscriptionWithCategory[]

// Map<billing_day, SubscriptionWithCategory[]> para el calendario
useSubscriptionsByDay(year: number, month: number): Map<number, SubscriptionWithCategory[]>

// Resumen financiero — respeta notAmortizeYearly
// notAmortizeYearly=false: totalMonthlyEstimate = totalMonthly + totalAnnual / 12
// notAmortizeYearly=true:  totalMonthlyEstimate = totalMonthly + totalAnnual
useExpenseSummary(): ExpenseSummary

// Total monetario de un día concreto
useDayTotal(day: number, year: number, month: number): number
```

---

## Componentes (`src/components/modules/expenses/`)

| Componente | Ruta | Responsabilidad |
|---|---|---|
| `ExpensesView` | `ExpensesView.tsx` | Orquestador principal. Inicializa el store, gestiona búsqueda debounced (300ms), abre modales. Persiste `notAmortizeYearly` en `localStorage` con key `arkhos-expense-amortize`. |
| `ExpenseCalendar` | `ExpenseCalendar.tsx` | Calendario mensual con 42 celdas (6×7). Navegación prev/next mes. Cabecera días en JetBrains Mono. Delega cada celda a `ExpenseCalendarCell`. |
| `ExpenseCalendarCell` | `ExpenseCalendarCell.tsx` | Celda individual del calendario. Desktop: HoverCard con `motion.div` (fade+scale). Mobile: Drawer de vaul. Iconos de suscripción con `motion.div` entrada escalonada (opacity 0→1, y 10→0). |
| `ExpensePopupContent` | `ExpensePopupContent.tsx` | Contenido compartido entre HoverCard y Drawer. Header con fecha + total del día. Lista de suscripciones con icono SVGL, nombre, badge ciclo e importe. |
| `ExpenseSummaryCard` | `ExpenseSummaryCard.tsx` | Card resumen con eyebrow reactivo según `cycleFilter` y total formateado con `Intl.NumberFormat`. Badges de conteo mensual/anual. |
| `ExpenseChartDialog` | `ExpenseChartDialog.tsx` | Botón con icono ChartPie → Dialog con PieChart de recharts. Colores por color de suscripción. Leyenda lateral con icono, nombre, importe y porcentaje. |
| `CycleFilterToggle` | `CycleFilterToggle.tsx` | Pill toggle Todo / Mensual / Anual. Indicador activo con `motion.div layoutId="cycle-indicator"` (spring animation). Lee/actualiza `cycleFilter` del store. |
| `SubscriptionList` | `SubscriptionList.tsx` | Lista de suscripciones activas filtradas. Stagger de entrada (30ms por fila) con framer-motion. Click en fila: `setSelectedDay(billing_day)`. Botón 3-dots → `SubscriptionModal` edición. Empty state con icono CreditCard. |
| `SubscriptionModal` | `SubscriptionModal.tsx` | Modal crear/editar suscripción. `ServicesCombobox` para autocompletar servicio. Validación Zod v4 (`'zod/v4'`). Toggle Activa/Pausada + botón Eliminar en modo edición. |
| `ServicesCombobox` | `ServicesCombobox.tsx` | Combobox custom con búsqueda sobre `subscriptionServices`. Al seleccionar: autocompleta nombre, serviceId e icono. Opción "Personalizado" para servicios no listados. |
| `CategoryManager` | `CategoryManager.tsx` | Modal CRUD de categorías. Lista con icono Lucide + nombre + color. Formulario inline para crear/editar. Confirmar eliminación si hay suscripciones asociadas. |
| `ExpenseLegend` | `ExpenseLegend.tsx` | Leyenda del calendario: dot azul (Mensual), dot dorado (Anual), cuadrado con número de hoy. |
| `SmartAddButton` | `SmartAddButton.tsx` | Placeholder para feature futura. Al clicar muestra Toast.info. Contiene TODO documentado para integración con Claude API. |

### Datos auxiliares

| Archivo | Ruta | Contenido |
|---|---|---|
| `subscriptionServices` | `src/data/subscriptionServices.ts` | Array de 22 servicios con `id`, `name`, `icon` (componente SVGL) y `color`. Netflix, Spotify, YouTube, Apple, GitHub, Figma, Notion, Vercel, Supabase, Linear, ChatGPT, iCloud, Dropbox, Adobe, Microsoft, Slack, Discord, Twitch, Amazon, 1Password, Raycast, Railway. |

### Hooks

| Hook | Ruta | Comportamiento |
|---|---|---|
| `useIsMobile` | `src/hooks/useIsMobile.ts` | Devuelve `boolean`. `true` si `window.innerWidth < 1024px` (breakpoint `lg` de Tailwind). Escucha `resize`. |

---

## Decisiones técnicas

### Por qué `billing_day` en lugar de `startDate.date` de Subflow

Subflow almacena la fecha de inicio completa (`startDate.date`) y deriva el día de cobro de ahí. En Arkhos, el día de cobro es lo relevante para la UI del calendario (queremos saber el día 1, 15, 28, etc.), no cuándo empezó la suscripción. Separar `billing_day` (INTEGER recurrente) de `started_at` (DATE opcional) hace la lógica más limpia y el edge case "día > días del mes" (ej: billing_day=31 en febrero) se maneja explícitamente en `getSubscriptionsForDay()`.

### Por qué SVGL para iconos de servicios conocidos

`@ridemountainpig/svgl-react` proporciona los logos oficiales de alta calidad de los servicios más comunes como componentes React. Esto es más fiel a la marca de cada servicio que usar un icono genérico de Lucide. El fallback (inicial del nombre en un cuadrado coloreado) garantiza que cualquier servicio custom también tenga representación visual.

### Responsive: HoverCard desktop vs Drawer mobile

En desktop, al hover sobre una celda del calendario con suscripciones se muestra un popover `motion.div` con `AnimatePresence` (fade + scale 0.95→1). En mobile, un tap abre un `Drawer` de vaul que sube desde la parte inferior de la pantalla. La decisión de qué mostrar la toma `useIsMobile()` (breakpoint 1024px). Esta separación evita el problema de hover en pantallas táctiles y proporciona la mejor UX en cada contexto.

### Por qué combobox custom en lugar de cmdk

La dependencia `cmdk` no está instalada en el proyecto. El `ServicesCombobox` implementa la misma experiencia (búsqueda filtrada + teclado) con un input nativo y un dropdown posicionado absolutamente, siguiendo el patrón de Subflow `services-combobox.tsx` pero sin dependencias adicionales.

---

## Roadmap

- **Smart Add con Claude API**: el usuario escribe 'Netflix 15.49 mensual día 1' y la API parsea y autocompleta el formulario. Implementar en `src/lib/ai/smart-add.ts` con la Claude API. Subflow lo implementa con `@google/generative-ai`.
- **Alertas de renovación próxima**: notificación (email o push) cuando una suscripción anual se renueva en los próximos 7 días.
- **Gráfico de evolución mensual histórico**: línea de gasto estimado mensual a lo largo del tiempo (cuando haya histórico de datos suficiente).
- **Exportación de datos CSV/PDF**: listado completo de suscripciones con totales para declaración o auditoría personal.
- **Multi-divisa con conversión automática**: suscripciones en USD, GBP, etc. con conversión a EUR via API de tipos de cambio (variable `EXCHANGERATE_API_KEY` ya en `.env.example`).
