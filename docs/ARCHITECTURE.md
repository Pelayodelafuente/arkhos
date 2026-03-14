# Plan Maestro — Plataforma Personal de Gestión

**Autor:** Pelayo de la Fuente
**Fecha:** Marzo 2026 · v1.0
**Estado:** Fase 1 completada — Fase 2 pendiente
**Dominio objetivo:** arkhos.pelayodelafuente.es (subdominio)
**Nombre de la plataforma:** Arkhos (ἀρχός — el que lidera, origen, centro de mando)

---

## 0. Resumen ejecutivo

Plataforma personal modular para centralizar la gestión profesional y financiera del día a día. Cuatro módulos iniciales (Proyectos, Mercados, Patrimonio, Gastos) unidos por una identidad visual premium, un sistema de autenticación robusto y una arquitectura pensada para escalar.

El desarrollo se hará con **Claude Code** como herramienta principal de desarrollo, con preview en tiempo real. Todo queda documentado desde el día uno.

---

## 1. Naming — Nombre definitivo

### **Arkhos** (ἀρχός)

- **Significado:** Del griego antiguo, "el que lidera", "el que está al origen". Raíz de palabras como arquitectura, arconte, monarquía.
- **Concepto:** Tu centro de mando personal. Desde aquí lideras tus proyectos, tus finanzas, tu patrimonio.
- **Subdominio:** arkhos.pelayodelafuente.es
- **Wordmark:** DM Serif Display, peso regular. Elegante, con carácter serif clásico.
- **Fonética:** Dos sílabas, sonido fuerte y claro. Funciona en español, inglés y cualquier idioma.
- **Branding:** Compatible con isotipo geométrico basado en la "A" o en un símbolo de arco/pórtico griego.

---

## 2. Stack tecnológico definitivo

### 2.1. Frontend

| Tecnología | Justificación |
|---|---|
| **Next.js 16.1.6 (App Router)** | SSR + SSG + API Routes en un solo framework. El estándar para apps React de producción. App Router para layouts compartidos entre módulos. |
| **TypeScript (strict mode)** | No negociable. Type safety en todo el codebase. Previene bugs, mejora la documentación automática del código. |
| **Tailwind CSS v4** | Utility-first. Con el sistema de variables CSS del brand se configura una vez y queda consistente en toda la app. Sin CSS custom suelto. |
| **Framer Motion** | Animaciones de interfaz. Transiciones entre módulos, micro-interacciones. Usado con mesura: diseño flat, pero con transiciones suaves. |
| **Recharts + Lightweight Charts (TradingView)** | Recharts para gráficas de patrimonio/gastos. Lightweight Charts para gráficas financieras en tiempo real (módulo Mercados). |
| **Lucide Icons** | Línea fina, consistente con el brand (line icons, 1.5-2px). Open source. |

### 2.2. Backend & Base de datos

| Tecnología | Justificación |
|---|---|
| **Supabase** | Auth + PostgreSQL + Realtime + Storage + Edge Functions en un solo servicio. RLS para proteger datos a nivel de DB. |
| **PostgreSQL (via Supabase)** | La base de datos más robusta para datos financieros. Soporte nativo de JSON, full-text search, y extensiones como pg_cron. |
| **Supabase Auth** | Autenticación con email/password + MFA obligatorio. JWT tokens, sesiones seguras. Integración nativa con RLS. |
| **Supabase Edge Functions (Deno)** | Para lógica de servidor: llamadas a APIs financieras, procesamiento IA, webhooks de alertas. |
| **Supabase Realtime** | Para datos de mercado en vivo. Subscripciones WebSocket nativas. |

### 2.3. IA & Datos financieros

| Tecnología | Justificación |
|---|---|
| **API de Anthropic (Claude Sonnet)** | Motor de análisis del módulo Mercados. Análisis de tendencias, correlaciones, señales, resúmenes en lenguaje natural. |
| **CoinGecko API** | Datos crypto: Bitcoin, Ethereum, etc. Free tier con rate limits razonables. |
| **Alpha Vantage / Twelve Data** | Datos de acciones, ETFs, forex, indicadores técnicos. |
| **ExchangeRate-API** | Divisas en tiempo real (EUR/USD, etc.). Gratuita para uso personal. |
| **Open-Meteo / FRED API** | Datos macro: tipos de interés, inflación, PIB. Contexto para el análisis IA. |

### 2.4. Infraestructura & Deploy

| Tecnología | Justificación |
|---|---|
| **GitHub** | Control de versiones. Monorepo con estructura de carpetas por módulo. |
| **Vercel** | Deploy automático desde GitHub. Preview deploys por rama. Integración nativa con Next.js. |
| **Hostinger DNS** | Registro CNAME para `arkhos.pelayodelafuente.es` apuntando a Vercel. |
| **Upstash Redis** | Cache para datos de APIs financieras. Evita rate limits. Serverless, pago por uso. |
| **Sentry** | Monitorización de errores en producción. |

### 2.5. PWA & Multiplataforma

| Tecnología | Justificación |
|---|---|
| **next-pwa** | Convierte la app en PWA instalable. Funciona offline, se instala como app nativa en iOS/Android/Desktop. |
| **Service Workers** | Cache de assets, funcionamiento offline básico. |
| **Web Push API** | Alertas push del módulo Mercados. Notificaciones nativas en móvil y desktop. |
| **Manifest.json** | Icono, splash screen, nombre de la app. |

---

## 3. Arquitectura del proyecto

### 3.1. Estructura del monorepo

```
arkhos/
├── .github/
│   └── workflows/          # CI/CD, linting, tests
├── public/
│   ├── icons/              # PWA icons (192, 512, maskable)
│   ├── manifest.json
│   └── sw.js               # Service Worker
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (auth)/         # Grupo: login, register, reset
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/    # Grupo: app autenticada
│   │   │   ├── layout.tsx  # Sidebar + topbar compartidos
│   │   │   ├── page.tsx    # Dashboard resumen (home)
│   │   │   ├── proyectos/
│   │   │   ├── mercados/
│   │   │   ├── patrimonio/
│   │   │   └── gastos/
│   │   ├── api/            # API Routes (Edge Functions locales)
│   │   │   ├── markets/
│   │   │   ├── ai/
│   │   │   └── webhooks/
│   │   ├── layout.tsx      # Root layout (fonts, theme)
│   │   └── globals.css     # Variables CSS del brand
│   ├── components/
│   │   ├── ui/             # Componentes base (Button, Card, Input, Badge...)
│   │   ├── layout/         # Sidebar, Topbar, MobileNav
│   │   ├── charts/         # Componentes de gráficas reutilizables
│   │   └── modules/        # Componentes específicos por módulo
│   │       ├── projects/
│   │       ├── markets/
│   │       ├── portfolio/
│   │       └── expenses/
│   ├── lib/
│   │   ├── supabase/       # Cliente, tipos, helpers
│   │   ├── ai/             # Prompts, parsing de respuestas
│   │   ├── market-data/    # Fetchers de APIs financieras
│   │   ├── utils/          # Formatters, dates, validators
│   │   └── hooks/          # Custom hooks (useAuth, useRealtime, etc.)
│   ├── stores/             # Zustand stores por módulo
│   ├── types/              # TypeScript types globales
│   └── config/             # Constantes, feature flags
├── supabase/
│   ├── migrations/         # SQL migrations versionadas
│   ├── seed.sql            # Datos iniciales
│   └── functions/          # Supabase Edge Functions
├── docs/
│   ├── ARCHITECTURE.md     # Este documento
│   ├── BRAND.md            # Brand guidelines
│   ├── API.md              # Documentación de APIs
│   ├── CHANGELOG.md        # Log de cambios
│   └── modules/
│       ├── PROJECTS.md
│       ├── MARKETS.md
│       ├── PORTFOLIO.md
│       └── EXPENSES.md
├── .env.local              # Variables de entorno (nunca en git)
├── .env.example            # Plantilla de variables
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### 3.2. Esquema de base de datos (Supabase/PostgreSQL)

```sql
-- ══════════════════════════════════════
-- AUTH (gestionado por Supabase Auth)
-- ══════════════════════════════════════

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- MÓDULO: PROYECTOS
-- ══════════════════════════════════════

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🌿',
  type TEXT DEFAULT 'Web',
  status TEXT DEFAULT 'idea' CHECK (status IN ('active','paused','done','idea')),
  stack TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  start_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in-progress','done')),
  notes TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE phase_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'none' CHECK (priority IN ('none','low','medium','high')),
  content TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES phase_tasks(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  label TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_name TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- MÓDULO: PATRIMONIO
-- ══════════════════════════════════════

CREATE TABLE portfolio_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('broker','crypto','bank','other')),
  currency TEXT DEFAULT 'EUR',
  notes TEXT DEFAULT '',
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE portfolio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES portfolio_accounts(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stock','etf','crypto','bond','fund','other')),
  quantity DECIMAL NOT NULL,
  avg_price DECIMAL NOT NULL,
  currency TEXT DEFAULT 'EUR',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE portfolio_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES portfolio_assets(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy','sell','dividend','fee','transfer')),
  quantity DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  total DECIMAL NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- MÓDULO: GASTOS
-- ══════════════════════════════════════

CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  color TEXT DEFAULT '#888780',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES expense_categories(id),
  amount DECIMAL NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  recurring BOOLEAN DEFAULT false,
  recurring_period TEXT CHECK (recurring_period IN ('monthly','yearly','weekly')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- MÓDULO: MERCADOS (cache + configuración)
-- ══════════════════════════════════════

CREATE TABLE market_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('crypto','forex','stock','commodity','index')),
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE market_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('above','below','pct_change')),
  value DECIMAL NOT NULL,
  active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  input_data JSONB,
  result TEXT NOT NULL,
  model TEXT DEFAULT 'claude-sonnet',
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- ROW LEVEL SECURITY (crítico)
-- ══════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

-- Política estándar: solo el usuario dueño accede a sus datos
CREATE POLICY "Users access own data" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users access own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- Para tablas hijas, la política se aplica con JOIN al user_id del padre:
CREATE POLICY "Users access own phases" ON project_phases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_phases.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Mismo patrón para phase_tasks, task_links, portfolio_assets,
-- portfolio_transactions y todas las demás tablas hijas.
```

### 3.3. Seguridad — Capas de protección

| Capa | Implementación |
|---|---|
| **Autenticación** | Supabase Auth con email/password + MFA (TOTP) obligatorio. Sin social login (superficie de ataque menor). |
| **Autorización** | Row Level Security en TODAS las tablas. Incluso si la API se compromete, PostgreSQL bloquea acceso a datos ajenos. |
| **Sesiones** | JWT con refresh tokens. Expiración corta (1h access, 7d refresh). Rotación automática. |
| **Rate Limiting** | Middleware en API Routes. Upstash Rate Limit para prevenir brute force. |
| **Headers** | CSP, HSTS, X-Frame-Options, X-Content-Type-Options via `next.config.ts` y Vercel headers. |
| **Variables de entorno** | Nunca en código. `.env.local` en local, Vercel Environment Variables en producción. `.env.example` como plantilla sin valores reales. |
| **Validación** | Zod para validar inputs en cliente y servidor. Nunca confiar en datos del frontend. |
| **HTTPS** | Vercel lo gestiona automáticamente con certificados Let's Encrypt. |
| **Audit Log** | Tabla `activity_log` registra todas las acciones sensibles. |

---

## 4. Identidad visual

### 4.1. Paleta de color

**Fondos**
- Crema: `#FAF7F2`
- Arena: `#F0EBE1`
- Cards: `#FFFFFF`

**Textos**
- Principal: `#1A1714`
- Secundario: `#3D3630`
- Terciario: `#888780`

**Bordes**
- Piedra: `#E2D9CA`, `1px solid`

**Acento**
- Terracota: `#C4704A` — botones, links activos, nav

**Colores por módulo**
- Proyectos: `#C4704A` (terracota)
- Patrimonio: `#5B8C6A` (verde salvia)
- Gastos: `#4A7A9B` (azul acero)
- Mercados: `#9B7A4A` (dorado)

### 4.2. Tipografía

- **Títulos**: DM Serif Display (peso regular)
- **Interfaz**: Plus Jakarta Sans
- **Datos numéricos**: JetBrains Mono

### 4.3. Principios de diseño

- Flat — sin sombras (excepción: modales `0 4px 20px rgba(26,23,20,0.08)`)
- Sin degradados
- Máximo whitespace
- Iconos: Lucide Icons, line style `1.5–2px`
- Modo oscuro: descartado en v1.0, pero arquitectura CSS variables lo facilita a futuro

### 4.4. Branding pendiente

| Entregable | Estado |
|---|---|
| Wordmark (logotipo textual) | ✅ "Arkhos" en DM Serif Display — `ArkhosLogo` |
| Isotipo (favicon/icono app) | ✅ A geométrica terracota — `ArkhosIcon` |
| PWA Icons (192px, 512px) | ✅ SVG en `public/icons/` |
| Open Graph images | Pendiente |
| Favicon set | ✅ `public/favicon.svg` |

---

## 5. Plan de ejecución — Fases

### FASE 0: Fundación (Semana 1)
**Objetivo:** Proyecto configurado, desplegado y con auth funcionando.

```
0.1  ✅ Nombre decidido: Arkhos
0.2  ✅ Crear repositorio en GitHub (privado, monorepo)
0.3  ✅ Scaffold Next.js 16.1.6 + TypeScript + Tailwind + App Router
0.4  ✅ Configurar estructura de carpetas según arquitectura
0.5  ✅ Configurar Tailwind con las variables CSS del brand
0.6  ✅ Crear proyecto en Supabase
0.7  ✅ Configurar tablas base (profiles + auth triggers)
0.8  ⏳ Implementar autenticación completa:
     - ✅ Login / Register / Reset password
     - ✅ Middleware de protección de rutas
     - ❌ MFA (segundo factor TOTP) — aplazado a Fase 2
0.9  ✅ Conectar Vercel + GitHub (deploy automático)
0.10 ✅ Configurar subdominio arkhos.pelayodelafuente.es → Vercel
0.11 ⏳ Configurar PWA (manifest ✅, service worker ❌, icons placeholder ✅)
0.12 ❌ Configurar Sentry para errores
0.13 ✅ Crear docs/ARCHITECTURE.md y docs/CHANGELOG.md
0.14 ✅ Primer deploy en producción con login funcional
```

**Entregable:** App desplegada en arkhos.pelayodelafuente.es con login + MFA + PWA instalable.

---

### FASE 1: Shell de la aplicación (Semana 2)
**Objetivo:** Layout principal, navegación entre módulos, sistema de componentes.

```
1.1  ✅ Diseñar y maquetar layout principal:
     - ✅ Sidebar con navegación (desktop)
     - ✅ Topbar (mobile + hamburguesa)
     - ✅ Bottom nav (mobile)
     - ❌ Transiciones entre módulos (Framer Motion)
1.2  ❌ Crear component library base (ui/):
     - Button, Card, Input, Select, Textarea
     - Badge, Pill, Tag
     - Modal, Dialog
     - Progress bar, Toast, Tooltip, Skeleton
1.3  ✅ Implementar sistema de temas con CSS variables
1.4  ✅ Diseñar wordmark + isotipo
1.5  ✅ Generar PWA icons (SVG)
1.6  ✅ Dashboard home (resumen de todos los módulos)
1.7  ⏳ Responsive testing: desktop ✅, tablet ⏳, mobile ✅
1.8  ❌ Documentar componentes en docs/
```

**Entregable:** Shell completa con navegación, componentes e identidad visual aplicada.

---

### FASE 2: Módulo Proyectos (Semanas 3-4)

```
2.1  Migrations SQL para tablas de proyectos
2.2  Configurar RLS policies
2.3  Implementar API layer (lib/supabase/projects.ts)
2.4  Vista lista de proyectos con filtros y tags
2.5  Vista Kanban
2.6  Detalle de proyecto con fases, timeline, progreso auto
2.7  Tareas con contenido expandible, prioridad, links
2.8  Reordenamiento de fases y tareas
2.9  Notas/apuntes por fase
2.10 Exportar proyecto a Markdown/JSON
2.11 Activity log integrado
2.12 Búsqueda global dentro de proyectos
2.13 Tests E2E del flujo completo
2.14 Documentar en docs/modules/PROJECTS.md
```

**Entregable:** Módulo Proyectos 100% funcional con persistencia real.

---

### FASE 3: Módulo Mercados (Semanas 5-7)

```
3.1  Integrar APIs de datos financieros:
     - CoinGecko (crypto)
     - Alpha Vantage / Twelve Data (stocks, ETFs, forex)
     - ExchangeRate-API (divisas)
     - FRED (datos macro)
3.2  Configurar Upstash Redis para cache de APIs
3.3  Dashboard principal de mercados:
     - Widgets de precio en tiempo real
     - Gráficas TradingView (Lightweight Charts)
     - Indicadores macro clave
3.4  Watchlist personalizable
3.5  Gráficas de correlaciones
3.6  Sistema de alertas (above/below/% change + Web Push)
3.7  Integración IA (Anthropic API):
     - Análisis de mercado on-demand
     - Resumen diario automático
     - Detección de tendencias y señales
     - Historial de análisis
3.8  Edge Functions para procesamiento de datos
3.9  Cron jobs para actualización periódica
3.10 Tests y documentación
```

**Entregable:** Dashboard de mercados completo con IA integrada y alertas push.

---

### FASE 4: Módulo Patrimonio (Semanas 8-9)

```
4.1  CRUD de cuentas (brokers, exchanges, bancos)
4.2  CRUD de activos por cuenta
4.3  Registro de transacciones (compras, ventas, dividendos)
4.4  Cálculo automático de:
     - Valor actual (con datos de APIs del módulo Mercados)
     - P&L por activo y por cuenta
     - % de rentabilidad (TWR y MWR)
     - Distribución por tipo de activo
4.5  Dashboard de patrimonio:
     - Valor total del portfolio
     - Evolución temporal (gráfica de área)
     - Distribución por tipo (donut chart)
     - Top gainers / losers
4.6  Conexión con módulo Mercados (precios en vivo)
4.7  Exportar informe de patrimonio
4.8  Tests y documentación
```

**Entregable:** Módulo Patrimonio con tracking completo y gráficas.

---

### FASE 5: Módulo Gastos (Semanas 10-11)

```
5.1  CRUD de categorías personalizables
5.2  Registro rápido de gastos
5.3  Gastos recurrentes (suscripciones, facturas)
5.4  Dashboard de gastos:
     - Gasto mensual por categoría (barras)
     - Evolución mensual (línea)
     - Distribución (circular)
     - Comparativa mes actual vs anterior
5.5  Filtros por fecha, categoría, tags
5.6  Presupuestos mensuales por categoría (opcional)
5.7  Exportar datos
5.8  Tests y documentación
```

**Entregable:** Módulo Gastos funcional con análisis visual.

---

### FASE 6: Pulido y lanzamiento (Semana 12)

```
6.1  Performance audit (Lighthouse > 90 en todo)
6.2  Accesibilidad (WCAG AA)
6.3  SEO meta tags + Open Graph
6.4  Testing cross-browser (Chrome, Safari, Firefox, mobile)
6.5  Testing PWA en iOS y Android
6.6  Backup strategy de Supabase
6.7  README final del repositorio
6.8  Documentación completa de todos los módulos
6.9  CHANGELOG actualizado
6.10 Lanzamiento
```

---

## 6. Workflow de desarrollo

### 6.1. Convenciones de código

- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)
- **Ramas:** `main` (producción), `dev` (desarrollo), `feat/nombre` (features)
- **Archivos:** kebab-case para archivos, PascalCase para componentes
- **TypeScript:** strict mode, no `any`, interfaces para todo
- **CSS:** Solo Tailwind utilities + CSS variables. Zero CSS custom suelto
- **Documentación:** Cada módulo documenta en `/docs/modules/`

### 6.2. Cierre de sesión de trabajo

Cada sesión debe cerrarse documentando:
1. Qué se hizo (lista de cambios)
2. Qué falta (próximos pasos)
3. Decisiones tomadas y por qué
4. Actualizar `docs/CHANGELOG.md`

---

## 7. Notas operativas

| Tema | Detalle |
|---|---|
| **Coste mensual estimado** | Vercel Free + Supabase Free + APIs gratuitas = 0€/mes para empezar. Upgrade: Supabase Pro ~25$/mes + Vercel Pro ~20$/mes si se necesita. |
| **Backup de datos** | Supabase tiene backups en plan Pro. En free tier, configurar export periódico vía pg_dump. |
| **Rate limiting de APIs** | Cache con Upstash es crítico para no agotar los límites de las APIs gratuitas. |
| **Migración de datos** | Script de migración necesario al pasar de localStorage (Project Grove) a Supabase. |
| **Offline mode** | PWA + Service Worker cachea datos; los writes se sincronizan al recuperar conexión. |
| **Keyboard shortcuts** | `Cmd+K` búsqueda global, `Cmd+N` nuevo proyecto. Prioritario para productividad. |
| **Exportación global** | Exportar todos los datos en JSON/ZIP. Soberanía de datos del usuario. |
| **Logs de seguridad** | Registrar intentos de login fallidos, cambios de password, activaciones de MFA. |
| **Versionado de API** | API routes con `/api/v1/...` para evitar roturas futuras. |
