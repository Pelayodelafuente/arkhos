# Arkhos (ἀρχός)

Plataforma personal de gestión modular.
**Autor**: Pelayo de la Fuente
**Dominio**: arkhos.pelayodelafuente.es

> Referencia maestra del proyecto. Consultar siempre antes de implementar.
> Para detalles de base de datos, fases de ejecución y decisiones arquitectónicas ver `docs/ARCHITECTURE.md`.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript strict (no `any`) |
| Estilos | Tailwind CSS v4 + CSS variables |
| Auth / DB | Supabase (Auth + PostgreSQL + Realtime + Edge Functions) |
| Cache | Upstash Redis |
| IA | Anthropic (módulo Mercados) |
| Deploy | Vercel |

---

## Módulos

| Módulo | Color |
|---|---|
| Proyectos | `#C4704A` (terracota) |
| Patrimonio | `#5B8C6A` (verde) |
| Gastos | `#4A7A9B` (azul) |
| Mercados | `#9B7A4A` (ocre) |

---

## Brand Identity

### Tipografía
- **Títulos**: DM Serif Display
- **Interfaz**: Plus Jakarta Sans
- **Datos numéricos**: JetBrains Mono

### Paleta de color

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

### Principios de diseño
- Flat — sin sombras (excepción: modales)
- Sin degradados
- Máximo whitespace
- Iconos: Lucide Icons, line style `1.5–2px`

---

## Seguridad

- Supabase Auth con **MFA obligatorio**
- **RLS** en todas las tablas
- JWT con refresh tokens
- Rate limiting
- Validación de datos con **Zod**

---

## Estructura de carpetas

```
src/
  app/               # Next.js App Router
    (auth)/          # Grupo rutas de autenticación
    (dashboard)/     # Grupo rutas del dashboard
  components/
    ui/              # Componentes base
    layout/          # Shell, nav, sidebar
    charts/          # Visualizaciones
    modules/         # Componentes por módulo
  lib/
    supabase/        # Cliente y helpers
    ai/              # Integración Anthropic
    market-data/     # Datos de mercado
    utils/           # Utilidades generales
    hooks/           # Custom hooks
  stores/            # Estado global (Zustand)

docs/                # Documentación del proyecto
supabase/
  migrations/        # Migraciones SQL
```

---

## Convenciones

- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- **Archivos**: kebab-case
- **Componentes**: PascalCase
- **Estilos**: solo Tailwind utilities + CSS variables — cero CSS custom arbitrario
- **TypeScript**: strict, sin `any`
- **Documentación**: todo en `/docs`, mantener `CHANGELOG.md` actualizado
