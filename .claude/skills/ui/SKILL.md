---
name: ui
description: >
  UI component library and design system for Arkhos — available components, colors, typography, patterns.
  Trigger: When creating or modifying UI components, layouts, or visual elements.
license: MIT
metadata:
  author: pelayo
  version: "1.0"
---

# UI Components Skill — Arkhos

## Importar siempre desde barrel

```ts
import { Button, Card, Input, ... } from '@/components/ui'
```

## Componentes disponibles

| Componente | Props clave |
|------------|-------------|
| Button | variant: `primary\|secondary\|ghost\|danger`, size: `sm\|md\|lg`, `loading` |
| Card | padding: `sm\|md\|lg`, `clickable` |
| Input | `label`, `error`, forwardRef, useId interno |
| Select | `label`, `error`, `options: {value,label}[]` |
| Textarea | `label`, `error`, forwardRef, resize-y |
| Badge | variant: `terracotta\|green\|blue\|gold\|gray` |
| Modal | `title`, `onClose` — Escape + click-outside automatico |
| Toast | `useToast()` → `.success(msg)` `.error(msg)` `.info(msg)` |
| Skeleton | animate-pulse, className para dimensiones y rounded |
| Progress | `value`: 0-100, label en JetBrains Mono |
| Tooltip | CSS-only, position: `top\|bottom` |
| ArkhosIcon | SVG isotipo geometrico |
| ArkhosLogo | size: `sm\|md\|lg` |

## Iconos

Solo Lucide React. Cero emojis en UI.
- Inline: `size={16}`
- Standalone: `size={20}`

## Colores de modulo

| Modulo | Texto | Fondo |
|--------|-------|-------|
| Proyectos | `text-[#C4704A]` | `bg-[#C4704A]/10` |
| Patrimonio | `text-[#5B8C6A]` | `bg-[#5B8C6A]/10` |
| Gastos | `text-[#4A7A9B]` | `bg-[#4A7A9B]/10` |
| Mercados | `text-[#9B7A4A]` | `bg-[#9B7A4A]/10` |

## Tipografia

- `font-heading` → DM Serif Display (titulos, nombres de modulo)
- `font-sans` → Plus Jakarta Sans (interfaz, labels, body)
- `font-mono` → JetBrains Mono (datos, numeros, fechas, codigo)

## Patrones establecidos

- Empty states: SVG inline simple + texto en DM Serif Display
- Loading: componente Skeleton, nunca spinners genericos
- Errores: `Toast.error()` + revert de estado (optimistic updates)
- Modales de confirmacion: Modal existente, nunca `alert()` nativo
- Drag & drop: `@dnd-kit` con handle `GripVertical` visible en hover
