# Responsive Patterns — Arkhos

## Breakpoint Strategy

Single breakpoint: `lg` (1024px). Mobile-first — default styles are mobile, `lg:` prefix for desktop.

```
Mobile (<1024px):  Topbar + BottomNav + MobileDrawer
Desktop (≥1024px): Sidebar (260px fixed)
```

## Navigation by device

| Component | Mobile | Desktop |
|-----------|--------|---------|
| Sidebar (260px) | `hidden lg:flex` | Visible |
| Topbar (h-14) | Visible | `lg:hidden` |
| MobileDrawer | Available (z-50) | `lg:hidden` |
| BottomNav (h-16) | `fixed bottom-0 z-30` | `lg:hidden` |

## Z-Index Stack

```
z-30  BottomNav
z-40  MobileDrawer overlay (bg-foreground/20)
z-50  MobileDrawer panel
z-100 Toasts
```

## Content Area Padding

```
Mobile:  px-4 py-6 pb-20  (pb-20 compensates BottomNav h-16)
Desktop: lg:px-8 lg:py-8 lg:pb-8
```

Content constraint: `max-w-5xl mx-auto`

## Auth Pages (Split-screen)

```
Mobile (<1024px):  Stack vertical — compact header (200px) + scrollable form
Desktop (≥1024px): Flex row — visual panel (flex-[7]) + form panel (flex-[3])
```

- Nav links: `absolute top/right` on desktop, below title on mobile
- Form padding: `px-6 py-8 sm:px-10` (mobile) → `lg:px-10` (desktop)
- MFA boxes: `w-[40px] h-[48px]` (mobile) → `sm:w-[48px] sm:h-[56px]` (desktop)

## Patterns to Follow

1. **Hide/show toggle**: `hidden lg:flex` / `lg:hidden` — never JS-based
2. **Drawer closes on navigation**: `onClick={onClose}` on all links
3. **Drawer width = Sidebar width**: Both 260px for consistency
4. **Bottom nav offset**: Always add `pb-20` to main content on mobile
5. **Active states differ by device**:
   - Sidebar/Drawer: `bg-accent text-[#FBF0EA]` + colored dot
   - BottomNav: `text-accent` only (no background fill)
6. **Form inputs on mobile**: min height 42px for touch targets
7. **Font scaling**: Keep base sizes, only reduce on `< 640px` if needed
