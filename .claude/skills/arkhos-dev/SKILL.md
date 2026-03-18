---
name: arkhos-dev
description: "Core development conventions for Arkhos. ALWAYS use this skill when writing, editing, fixing, refactoring, or reviewing ANY code in this project. Triggers on: creating components, writing functions, fixing bugs, adding features, modifying styles, updating configs, database work, writing tests — essentially any development task. If you're about to touch a file in this repo, consult this skill first."
---

# Arkhos — Development Conventions

This skill defines the non-negotiable rules for all development work in Arkhos. Every code change — from a one-line fix to a full module — must follow these conventions. They exist because Arkhos is a long-lived personal platform where consistency compounds: a shortcut today becomes tech debt tomorrow.

---

## Project Structure

This is the canonical folder layout. Place new files in the correct location — never create ad-hoc directories.

```
src/
  app/
    (auth)/              → Auth pages: login, register, reset-password, verify-mfa
    (dashboard)/         → Dashboard layout + all modules + settings
    globals.css          → CSS variables, @theme inline, all custom keyframes
  components/
    ui/                  → Design system (barrel: ui/index.ts)
    layout/              → Sidebar, Topbar, MobileDrawer, BottomNav
    auth/                → Auth-specific components (ParticleCanvas, AnimatedLogo, etc.)
    modules/
      proyectos/         → Project module components
      gastos/            → Expenses module components
      (patrimonio/)      → Future
      (mercados/)        → Future
  lib/
    supabase/            → client.ts, server.ts, types.ts + per-module data layers
    validations/         → Zod schemas
    utils/               → Shared utilities (format.ts, etc.)
  stores/                → Zustand stores (ui-store.ts, projects-store.ts, expenses-store.ts)
  types/                 → TypeScript type definitions
  proxy.ts               → Session middleware (MFA AAL check)
supabase/
  migrations/            → Sequential numbered migrations
  seeds/                 → Sample data SQL
docs/                    → ARCHITECTURE.md, CHANGELOG.md, STATUS.md
docs/modules/            → Per-module documentation
```

---

## Naming Conventions

| What | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `password-strength.tsx`, `ui-store.ts` |
| Components | PascalCase | `PasswordStrength`, `ParticleCanvas` |
| Directories | kebab-case | `reset-password/`, `project-logos/` |
| Types/Interfaces | PascalCase | `interface ProjectStatus` |
| Variables/functions | camelCase | `const filteredProjects`, `function handleSubmit` |
| CSS classes (custom) | kebab-prefix by domain | `auth-float`, `auth-orbit-1` |
| Zustand stores | `use[Name]Store` | `useUIStore`, `useProjectsStore` |

---

## TypeScript

- **strict mode always** — zero `tsc --noEmit` errors at all times
- **No `any`** — use `unknown` if the type is truly unknown, then narrow
- **Interfaces for all shapes** — props, API responses, store state, form data
- **Zod v4** — always import from `'zod/v4'`, never from `'zod'`

```typescript
// Correct
import { z } from 'zod/v4';

// Wrong
import { z } from 'zod';
```

---

## React & Next.js Patterns

### Server Components by default

Every component is a Server Component unless it needs client-side interactivity. Only add `'use client'` when the component uses:
- `useState`, `useEffect`, `useRef`, or other hooks
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`window`, `document`, `localStorage`)
- Zustand stores

The reasoning: Server Components render on the server, send zero JS to the client, and can directly access Supabase with `createServerClient`. This keeps the bundle small and pages fast.

### Imports — always barrel exports

```typescript
// Correct — single import from barrel
import { Button, Card, Input, Modal } from '@/components/ui';

// Wrong — deep imports
import { Button } from '@/components/ui/button';
```

The barrel file is `src/components/ui/index.ts`. When you create a new UI component, export it from the barrel.

### Server Actions for mutations

Use Server Actions (functions with `'use server'`) for all data mutations (create, update, delete). Do not create API routes (`route.ts`) for basic CRUD — Server Actions are simpler, type-safe, and colocated with the UI.

API routes are only for webhooks, external integrations, or auth callbacks.

### Data fetching pattern

```
Server Component → calls lib/supabase/[module].ts functions directly
Client Component → calls Zustand store actions → which call lib/supabase/[module].ts
```

Zustand stores implement optimistic updates with rollback + Toast on error.

---

## Styling

### Only Tailwind utilities + CSS variables

Never write inline styles for colors, spacing, or typography that have a CSS variable or Tailwind token. The design system lives in `globals.css` via `@theme inline`.

### Color tokens (use these, not hex values)

| Token | Use for |
|-------|---------|
| `bg-background` | Page backgrounds (#FAF7F2) |
| `bg-sand` | Secondary backgrounds (#F0EBE1) |
| `bg-card` | Card/panel backgrounds (#FFFFFF) |
| `bg-accent` | Primary action buttons (#C4704A) |
| `text-foreground` | Primary text (#1A1714) |
| `text-text-secondary` | Secondary text (#3D3630) |
| `text-text-tertiary` | Muted text (#888780) |
| `text-accent` | Accent text/links (#C4704A) |
| `border-border` | All borders (#E2D9CA) |

Module colors: `text-proyectos`, `text-patrimonio`, `text-gastos`, `text-mercados`.

### Typography

| Class | Font | Use for |
|-------|------|---------|
| `font-heading` | DM Serif Display | Titles, display text |
| `font-sans` | Plus Jakarta Sans | Interface text (default) |
| `font-mono` | JetBrains Mono | Numbers, data, code |

### Visual principles

- **Flat** — no box-shadow except on modals (`--shadow-modal`)
- **No gradients** — solid colors only
- **Maximum whitespace** — let content breathe
- **Rounded corners** — `rounded-xl` for cards, `rounded-md` for inputs/buttons
- **Borders** — `border border-border` (1px solid #E2D9CA)
- **No emojis in UI** — use Lucide React icons exclusively

---

## Supabase

- **RLS on EVERY table** — no exceptions. Verify after every migration.
- **Server Actions** use `createServerClient` from `@supabase/ssr`
- **Client components** use `createClient` from `@/lib/supabase/client`
- Never expose `user_id` in public URLs
- Secrets only in `.env.local` + Vercel env vars — never in code

---

## Git & Commits

### Conventional Commits — mandatory

Every commit message follows this format:

```
type(scope): concise description

Optional body with more detail.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

| Type | When |
|------|------|
| `feat:` | New feature or capability |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code restructuring, no behavior change |
| `chore:` | Build, CI, deps, config |
| `test:` | Adding or fixing tests |

Scope is optional but encouraged: `feat(auth):`, `fix(gastos):`, `refactor(projects):`.

### Branch strategy

- `feat/name` or `fix/name` → PR → `main`
- Branch protection is active on `main`

---

## RULE #1 — Documentation Updates (Highest Priority)

After every meaningful work session, these three files MUST be updated. This is non-negotiable — undocumented work is invisible work.

### 1. `docs/CHANGELOG.md`
- Add a dated entry describing what was done
- Group under the active phase
- Be specific: mention components created, patterns introduced, bugs fixed

### 2. `docs/STATUS.md`
- Mark completed tasks with checkmarks
- Update phase completion percentages
- Add new tasks if scope expanded

### 3. `CLAUDE.md` (root)
- Update if new modules, components, or patterns were added to the project
- Keep the "Componentes UI disponibles" section current
- Update module-specific sections when data layers or stores change
- This file is the source of truth — if it's not in CLAUDE.md, it doesn't exist for future sessions

### Verification before closing

```bash
tsc --noEmit        # Must pass with 0 errors
npx next build      # Must compile cleanly
```

Both checks must pass before committing. If either fails, fix before proceeding.

---

## Quick Reference — Decision Tree

**Creating a new component?**
→ Server Component unless it needs hooks/events
→ Put in the right directory (ui/, modules/[name]/, layout/, auth/)
→ If UI component: export from `ui/index.ts`
→ Name: PascalCase component, kebab-case file

**Adding a new feature?**
→ Types in `src/types/`
→ Data layer in `src/lib/supabase/[module].ts`
→ Zustand store in `src/stores/[module]-store.ts`
→ Components in `src/components/modules/[module]/`
→ Page in `src/app/(dashboard)/[module]/`

**Fixing a bug?**
→ Fix it
→ `tsc --noEmit`
→ Update CHANGELOG

**Writing a migration?**
→ Sequential number: `00X_description.sql`
→ Include RLS policies
→ Test with `supabase db reset` if possible

**Styling something?**
→ Tailwind tokens first
→ CSS variables from globals.css for anything custom
→ No inline hex colors — use the design tokens
→ Lucide icons, never emojis

**Building a layout or responsive component?**
→ Read `references/responsive.md` in this skill directory for breakpoints, z-index stack, and patterns
→ Single breakpoint: `lg` (1024px), mobile-first
→ `hidden lg:flex` / `lg:hidden` for show/hide — never JS-based
→ Bottom nav offset: `pb-20` on mobile main content

---

## Bundled References

| File | When to read |
|------|-------------|
| `references/responsive.md` | Building layouts, responsive components, navigation, or auth pages |
