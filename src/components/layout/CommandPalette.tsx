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
  Sparkles,
  PenLine,
  Loader2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useNotesStore } from "@/stores/notes-store"
import { useUIStore } from "@/stores/ui-store"

// ══════════════════════════════════════
// Command Palette global (F4.4) — ⌘K / Ctrl+K
// Navegación + búsqueda de notas, proyectos y suscripciones (RLS via cliente browser)
// + Quick Capture universal: crear nota o agendar con IA desde cualquier pantalla.
// El estado interno vive en PaletteDialog, que se monta al abrir — así cada
// apertura arranca limpia sin resets en efectos.
// ══════════════════════════════════════

interface PaletteItem {
  id: string
  label: string
  hint: string
  href?: string
  action?: "capture-note" | "capture-agenda"
  icon: React.ReactNode
  group: "Acciones" | "Navegación" | "Notas" | "Proyectos" | "Suscripciones" | "Cronos"
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

  // Atajo global ⌘K / Ctrl+K + evento del Topbar móvil (botón de búsqueda)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === "Escape") setOpen(false)
    }
    const onOpenEvent = () => setOpen(true)
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("arkhos:open-palette", onOpenEvent)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("arkhos:open-palette", onOpenEvent)
    }
  }, [])

  if (!open) return null
  return <PaletteDialog userId={userId} onClose={() => setOpen(false)} />
}

function PaletteDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PaletteItem[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [capturing, setCapturing] = useState<"note" | "agenda" | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const addNote = useNotesStore((s) => s.addNote)
  const addToast = useUIStore((s) => s.addToast)

  // Búsqueda global de contenido (FTS español) con debounce — RPC global_search
  // busca en título Y contenido de notas, proyectos, suscripciones y eventos.
  useEffect(() => {
    const q = query.trim()
    const t = setTimeout(async () => {
      if (!userId || q.length < 2) {
        setResults([])
        return
      }
      const client = createClient()
      const { data } = await client.rpc("global_search", { p_query: q, p_limit: 12 })

      const items: PaletteItem[] = (data ?? []).map((r) => {
        switch (r.kind) {
          case "note":
            return {
              id: `note-${r.id}`,
              label: r.title,
              hint: "Abrir nota",
              href: `/notas?note=${r.id}`,
              icon: <StickyNote size={15} />,
              group: "Notas" as const,
            }
          case "project":
            return {
              id: `project-${r.id}`,
              label: r.title,
              hint: "Abrir proyecto",
              href: `/proyectos/${r.id}`,
              icon: <FolderKanban size={15} />,
              group: "Proyectos" as const,
            }
          case "event":
            return {
              id: `event-${r.id}`,
              label: r.title,
              hint: "Ver en Cronos",
              href: "/agenda",
              icon: <CalendarDays size={15} />,
              group: "Cronos" as const,
            }
          default:
            return {
              id: `sub-${r.id}`,
              label: r.title,
              hint: "Ver en Gastos",
              href: "/gastos",
              icon: <CreditCard size={15} />,
              group: "Suscripciones" as const,
            }
        }
      })
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

  // Quick Capture universal: con texto libre, ofrecer crear nota o agendar con IA
  const captureItems = useMemo<PaletteItem[]>(() => {
    const q = query.trim()
    if (q.length < 3) return []
    const short = q.length > 60 ? `${q.slice(0, 60)}…` : q
    return [
      {
        id: "capture-note",
        label: `Crear nota: «${short}»`,
        hint: "Captura",
        action: "capture-note",
        icon: <PenLine size={15} />,
        group: "Acciones",
      },
      {
        id: "capture-agenda",
        label: `Agendar con IA: «${short}»`,
        hint: "Cronos",
        action: "capture-agenda",
        icon: <Sparkles size={15} />,
        group: "Acciones",
      },
    ]
  }, [query])

  const allItems = useMemo(
    () => [...filteredNav, ...results, ...captureItems],
    [filteredNav, results, captureItems]
  )

  const runCapture = useCallback(
    async (kind: "note" | "agenda") => {
      const text = query.trim()
      if (!text || capturing) return
      setCapturing(kind)
      try {
        if (kind === "note") {
          const note = await addNote(userId, {
            title: text.length > 80 ? `${text.slice(0, 80)}…` : text,
            content: text.length > 80 ? text : "",
            color: "default",
            icon: "FileText",
            tags: [],
          })
          // addNote ya lanza su propio toast de éxito/error
          if (note) onClose()
        } else {
          const res = await fetch("/api/agenda/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: text,
              tz_offset_min: -new Date().getTimezoneOffset(),
            }),
          })
          const reply = await res.text()
          if (res.ok) {
            addToast(reply.slice(0, 200) || "Hecho", "success")
            onClose()
          } else {
            addToast(reply || "No se pudo agendar", "error")
          }
        }
      } catch {
        addToast("Error en la captura rápida", "error")
      } finally {
        setCapturing(null)
      }
    },
    [query, capturing, addNote, addToast, onClose, userId]
  )

  const select = useCallback(
    (item: PaletteItem) => {
      if (item.action === "capture-note") {
        void runCapture("note")
        return
      }
      if (item.action === "capture-agenda") {
        void runCapture("agenda")
        return
      }
      if (!item.href) return
      onClose()
      router.push(item.href)
    },
    [router, onClose, runCapture]
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
            placeholder="Buscar… o escribe algo para capturarlo (nota / agenda)"
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
                  disabled={capturing !== null}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(item)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${
                    index === activeIndex ? "bg-sand text-foreground" : "text-text-secondary"
                  }`}
                >
                  <span className="text-text-tertiary">{item.icon}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                    {capturing !== null && item.action ? (
                      <Loader2 size={12} className="animate-spin" aria-hidden />
                    ) : (
                      <>
                        {item.hint}
                        <ArrowRight size={11} aria-hidden />
                      </>
                    )}
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
