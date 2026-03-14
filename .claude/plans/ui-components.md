# Plan: Cerrar pendientes Fase 1 — Component Library UI + Zustand + Refactor

## Estado actual
- Next.js 16.1.6 + TS strict + Tailwind v4 + Supabase + Auth funcional
- Shell completa: sidebar, topbar, mobile drawer, bottom nav, dashboard
- Desplegado en arkhos.pelayodelafuente.es
- Componentes UI existentes: ArkhosIcon, ArkhosLogo
- **Pendiente**: 11 componentes UI base, zustand store, refactor de vistas

## Paso 1: Instalar zustand
```
npm install zustand
```

## Paso 2: Crear 11 componentes UI en `src/components/ui/`

Todos siguen el brand: flat, sin sombras (excepto modal), bordes 1px #E2D9CA, Tailwind utilities.

### button.tsx
- Variantes: primary (bg-accent text-white), secondary (border-border), ghost (hover:bg-sand), danger (bg-red)
- Tamaños: sm, md, lg
- Props: variant, size, loading (spinner + disabled), disabled, extiende ButtonHTMLAttributes

### card.tsx
- bg-card border border-border rounded-xl p-5
- Si onClick → cursor-pointer hover:border-accent
- Extiende HTMLAttributes

### input.tsx
- forwardRef, label arriba, error message abajo, borde piedra, focus:border-accent
- Soporta type text/email/password/number/date
- Extiende InputHTMLAttributes

### select.tsx
- Mismo estilo que Input, con chevron icon
- Props: label, error, options: {value, label}[]

### textarea.tsx
- Mismo estilo, resize-y
- Props: label, error, extiende TextareaHTMLAttributes

### badge.tsx
- Variantes: terracotta, green, blue, gold, gray
- Pill shape rounded-full, bg con 15% opacidad del color

### modal.tsx ("use client")
- Overlay fixed bg-foreground/30 backdrop-blur-sm
- Card centrada con shadow-modal, cierra con Escape + click overlay
- Props: open, onClose, title, children

### toast.tsx ("use client")
- ToastProvider renderiza toasts arriba derecha desde zustand store
- useToast hook: toast.success(), toast.error(), toast.info()
- Auto-dismiss 4s

### skeleton.tsx
- bg-sand rounded-md animate-pulse
- Props: className para w/h

### tooltip.tsx
- CSS group/hover, fondo carbón, texto crema, text-xs
- Props: content, position (top/bottom), children

### progress.tsx
- Barra: fondo sand, relleno accent
- Props: value (0-100), showLabel, className

## Paso 3: Zustand store — `src/stores/ui-store.ts`
- sidebarOpen + toggleSidebar/closeSidebar
- toasts[] + addToast/removeToast
- activeModal + openModal/closeModal

## Paso 4: Refactorizar vistas existentes

### Auth pages (login, register, reset-password)
- div.rounded-lg.border → Card
- input raw → Input component
- button submit → Button variant="primary" loading={pending}

### Dashboard page
- Module link cards → Card envolviendo Link
- Activity card → Card

### Sidebar + MobileDrawer
- Botón logout → Button variant="secondary" size="sm"
- Mover estado open del Topbar al zustand store

### Module placeholder pages (proyectos, mercados, patrimonio, gastos)
- div.rounded-lg.border → Card

## Paso 5: Shimmer keyframe en globals.css (para Skeleton)

## Paso 6: Build + commit
- tsc --noEmit
- next build
- Commit: "feat: component library UI base + zustand store + refactor existing views"

## Archivos nuevos (13)
- src/components/ui/{button,card,input,select,textarea,badge,modal,toast,skeleton,tooltip,progress}.tsx
- src/stores/ui-store.ts
- src/components/ui/index.ts (barrel export)

## Archivos modificados (~10)
- package.json, globals.css
- login/page.tsx, register/page.tsx, reset-password/page.tsx
- dashboard/page.tsx, dashboard/layout.tsx
- sidebar.tsx, topbar.tsx, mobile-drawer.tsx
- Module placeholder pages
