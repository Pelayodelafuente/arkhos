"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  Wallet,
  StickyNote,
  Landmark,
  LineChart,
  CalendarDays,
  Settings,
  CreditCard,
  ArrowRight,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

// ══════════════════════════════════════
// Command Palette global (F4.4) — ⌘K / Ctrl+K
// Navegación + búsqueda de notas, proyectos y suscripciones (RLS via cliente browser)
// El estado interno vive en PaletteDialog, que se monta al abrir — así cada
// apertura arranca limpia sin resets en efectos.
// ══════════════════════════════════════

interface PaletteItem {
  id: string
  label: string
  hint: string
  href: string
  icon: React.ReactNode
  group: "Navegación" | "Notas" | "Proyectos" | "Suscripciones"
}

const NAV_ITEMS: PaletteItem[] = [
  { id: "nav-dashboard", label: "Dashboard", hint: "Ir a", href: "/", icon: <LayoutDashboard size={15} />, group: "Navegación" },
  { id: "nav-proyectos", label: "Proyectos", hint: "Ir a", href: "/proyectos", icon: <FolderKanban size={15} />, group: "Navegación" },
  { id: "nav-gastos", label: "Gastos", hint: "Ir a", href: "/gastos", icon: <Wallet size={15} />, group: "Navegación" },
  { id: "nav-notas", label: "Notas", hint: "Ir a", href: "/notas", icon: <StickyNote size={15} />, group: "Navegación" },
  { id: "nav-patrimonio", label: "Patrimonio", hint: "Ir a", href: "/patrimonio", icon: <Landmark size={15} />, group: "Navegación" },
  { id: "nav-mercados", label: "Mercados", hint: "Ir a", href: "/mercados", icon: <LineChart size={15} />, group: "Navegación" },
  { id: "nav-agenda", label: "Cronos", hint: "Ir a", href: "/agenda", icon: <CalendarDays size={15} />, group: "Navegación" },
  { id: "nav-settings", label: "Ajustes", hint: "Ir a", href: "/settings", icon: <Settings size={15} />, group: "Navegación" },
]

interface Props {
  userId: string
}

export function CommandPalette({ userId }: Props) {
  const [open, setOpen] = useState(false)

  // Atajo global ⌘K / Ctrl+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  if (!open) return null
  return <PaletteDialog userId={userId} onClose={() => setOpen(false)} />
}

function PaletteDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PaletteItem[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Búsqueda en DB con debounce
  useEffect(() => {
    const q = query.trim()
    const t = setTimeout(async () => {
      if (!userId || q.length < 2) {
        setResults([])
        return
      }
      const client = createClient()
      const pattern = `%${q}%`
      const [notes, projects, subs] = await Promise.all([
        client
          .from("notes")
          .select("id, title")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .ilike("title", pattern)
          .limit(5),
        client
          .from("projects")
          .select("id, name")
          .eq("user_id", userId)
          .neq("status", "archived")
          .ilike("name", pattern)
          .limit(5),
        client
          .from("subscriptions")
          .select("id, name")
          .eq("user_id", userId)
          .ilike("name", pattern)
          .limit(5),
      ])

      const items: PaletteItem[] = [
        ...((notes.data ?? []).map((n) => ({
          id: `note-${n.id}`,
          label: n.title,
          hint: "Abrir nota",
          href: `/notas?note=${n.id}`,
          icon: <StickyNote size={15} />,
          group: "Notas" as const,
        }))),
        ...((projects.data ?? []).map((p) => ({
          id: `project-${p.id}`,
          label: p.name,
          hint: "Abrir proyecto",
          href: `/proyectos/${p.id}`,
          icon: <FolderKanban size={15} />,
          group: "Proyectos" as const,
        }))),
        ...((subs.data ?? []).map((s) => ({
          id: `sub-${s.id}`,
          label: s.name,
          hint: "Ver en Gastos",
          href: "/gastos",
          icon: <CreditCard size={15} />,
          group: "Suscripciones" as const,
        }))),
      ]
      setResults(items)
      setActiveIndex(0)
    }, 180)
    return () => clearTimeout(t)
  }, [query, userId])

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return NAV_ITEMS
    return NAV_ITEMS.filter((i) => i.label.toLowerCase().includes(q))
  }, [query])

  const allItems = useMemo(() => [...filteredNav, ...results], [filteredNav, results])

  const select = useCallback(
    (item: PaletteItem) => {
      onClose()
      router.push(item.href)
    },
    [router, onClose]
  )

  // Navegación con teclado dentro de la paleta
  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, allItems.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter" && allItems[activeIndex]) {
        e.preventDefault()
        select(allItems[activeIndex])
      }
    },
    [allItems, activeIndex, select]
  )

  // Mantener el item activo visible
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  let groupShown: string | null = null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-foreground/20 px-4 pt-[18vh]"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card"
        style={{ boxShadow: "var(--shadow-modal, 0 16px 48px rgba(26,23,20,0.18))" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search size={15} className="shrink-0 text-text-tertiary" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Buscar notas, proyectos, suscripciones…"
            aria-label="Buscar en Arkhos"
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-text-tertiary"
          />
          <kbd className="shrink-0 rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">
            ESC
          </kbd>
        </div>

        <div ref={listRef} role="listbox" aria-label="Resultados" className="max-h-72 overflow-y-auto p-2">
          {allItems.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-text-tertiary">
              Sin resultados para «{query.trim()}»
            </p>
          )}
          {allItems.map((item, index) => {
            const showHeader = item.group !== groupShown
            groupShown = item.group
            return (
              <div key={item.id}>
                {showHeader && (
                  <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                    {item.group}
                  </p>
                )}
                <button
                  type="button"
                  data-index={index}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(item)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    index === activeIndex ? "bg-sand text-foreground" : "text-text-secondary"
                  }`}
                >
                  <span className="text-text-tertiary">{item.icon}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                    {item.hint}
                    <ArrowRight size={11} aria-hidden />
                  </span>
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[10px] text-text-tertiary">
          <span><kbd className="font-mono">↑↓</kbd> navegar</span>
          <span><kbd className="font-mono">↵</kbd> abrir</span>
          <span className="ml-auto font-mono">⌘K</span>
        </div>
      </div>
    </div>
  )
}
