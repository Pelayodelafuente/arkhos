"use client"

import { useState, useMemo } from "react"
import {
  Plus, Trash2, Pencil, X, Check, Search,
  // Tech & Dev
  Terminal, Code2, Globe, Server, Database, CloudUpload, Wifi,
  Smartphone, Laptop, Monitor, HardDrive, Cpu, BrainCircuit, Bot,
  ShieldCheck, KeyRound, FingerprintIcon,
  // Productivity & Tools
  LayoutDashboard, Workflow, GitBranch, Blocks, Wrench, Settings2,
  // Finance
  Banknote, CreditCard, Wallet, TrendingUp, BarChart3, Receipt, Landmark, CircleDollarSign,
  // Transport
  Car, Plane, Train,
  // Media & Entertainment
  Headphones, Tv2, MonitorPlay, Clapperboard, Gamepad, Camera, Radio,
  // Education
  GraduationCap, BookOpen, FlaskConical, Lightbulb,
  // Lifestyle
  Activity, Home, Heart, Dumbbell, UtensilsCrossed, Coffee, Scissors,
  // Commerce & Social
  ShoppingCart, ShoppingBag, Users, MessageSquare, Mail, Star, Layers, Zap,
  type LucideIcon
} from "lucide-react"
import { Modal, Button, Input } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import type { ExpenseCategory } from "@/types/expenses"

// ─── Icon Library ─────────────────────────────────────────────────────────────

const ICON_LIBRARY: { name: string; label: string; Icon: LucideIcon }[] = [
  // Streaming & Media
  { name: "monitor-play",   label: "Streaming",  Icon: MonitorPlay },
  { name: "tv-2",           label: "TV",         Icon: Tv2 },
  { name: "clapperboard",   label: "Cine",       Icon: Clapperboard },
  { name: "headphones",     label: "Música",     Icon: Headphones },
  { name: "radio",          label: "Radio/Pod",  Icon: Radio },
  { name: "camera",         label: "Foto",       Icon: Camera },
  { name: "gamepad",        label: "Gaming",     Icon: Gamepad },
  // Tech & Dev
  { name: "terminal",       label: "Terminal",   Icon: Terminal },
  { name: "code-2",         label: "Dev",        Icon: Code2 },
  { name: "globe",          label: "Web",        Icon: Globe },
  { name: "server",         label: "Servidor",   Icon: Server },
  { name: "database",       label: "Database",   Icon: Database },
  { name: "cloud-upload",   label: "Cloud",      Icon: CloudUpload },
  { name: "wifi",           label: "Red",        Icon: Wifi },
  { name: "smartphone",     label: "Móvil",      Icon: Smartphone },
  { name: "laptop",         label: "Portátil",   Icon: Laptop },
  { name: "monitor",        label: "Monitor",    Icon: Monitor },
  { name: "hard-drive",     label: "Almac.",     Icon: HardDrive },
  { name: "cpu",            label: "CPU",        Icon: Cpu },
  { name: "git-branch",     label: "Git",        Icon: GitBranch },
  { name: "blocks",         label: "API",        Icon: Blocks },
  // AI & Emerging
  { name: "brain-circuit",  label: "IA",         Icon: BrainCircuit },
  { name: "bot",            label: "Bot",        Icon: Bot },
  { name: "zap",            label: "Automatiz.", Icon: Zap },
  // Security
  { name: "shield-check",   label: "Seguridad",  Icon: ShieldCheck },
  { name: "key-round",      label: "Contraseña", Icon: KeyRound },
  { name: "fingerprint",    label: "Biométrico", Icon: FingerprintIcon },
  // Productivity
  { name: "layout-dashboard",label: "Dashboard", Icon: LayoutDashboard },
  { name: "workflow",       label: "Workflow",   Icon: Workflow },
  { name: "settings-2",     label: "Ajustes",    Icon: Settings2 },
  { name: "wrench",         label: "Herramientas",Icon: Wrench },
  // Finance
  { name: "banknote",       label: "Billete",    Icon: Banknote },
  { name: "credit-card",    label: "Tarjeta",    Icon: CreditCard },
  { name: "wallet",         label: "Cartera",    Icon: Wallet },
  { name: "trending-up",    label: "Inversión",  Icon: TrendingUp },
  { name: "bar-chart-3",    label: "Finanzas",   Icon: BarChart3 },
  { name: "receipt",        label: "Factura",    Icon: Receipt },
  { name: "landmark",       label: "Banco",      Icon: Landmark },
  { name: "circle-dollar-sign", label: "Divisa", Icon: CircleDollarSign },
  // Transport
  { name: "car",            label: "Coche",      Icon: Car },
  { name: "plane",          label: "Avión",      Icon: Plane },
  { name: "train",          label: "Tren",       Icon: Train },
  // Education
  { name: "graduation-cap", label: "Educación",  Icon: GraduationCap },
  { name: "book-open",      label: "Libro",      Icon: BookOpen },
  { name: "flask-conical",  label: "Ciencia",    Icon: FlaskConical },
  { name: "lightbulb",      label: "Ideas",      Icon: Lightbulb },
  // Lifestyle & Health
  { name: "activity",       label: "Salud/Fit",  Icon: Activity },
  { name: "dumbbell",       label: "Gym",        Icon: Dumbbell },
  { name: "heart",          label: "Bienestar",  Icon: Heart },
  { name: "home",           label: "Hogar",      Icon: Home },
  { name: "utensils-crossed",label: "Comida",    Icon: UtensilsCrossed },
  { name: "coffee",         label: "Café",       Icon: Coffee },
  { name: "scissors",       label: "Peluquería", Icon: Scissors },
  // Commerce & Social
  { name: "shopping-cart",  label: "Compras",    Icon: ShoppingCart },
  { name: "shopping-bag",   label: "Tienda",     Icon: ShoppingBag },
  { name: "users",          label: "Comunidad",  Icon: Users },
  { name: "message-square", label: "Mensajería", Icon: MessageSquare },
  { name: "mail",           label: "Email",      Icon: Mail },
  { name: "star",           label: "Premium",    Icon: Star },
  { name: "layers",         label: "General",    Icon: Layers },
]

export const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ICON_LIBRARY.map(({ name, Icon }) => [name, Icon])
)

/** Renders a Lucide icon by stored name. Returns null if not found. */
export function renderIconByName(
  iconName: string,
  size = 13,
  color?: string
): React.ReactNode {
  const Icon = ICON_MAP[iconName]
  if (!Icon) return null
  return <Icon size={size} strokeWidth={1.75} style={color ? { color } : undefined} />
}

// ─── Color Presets ────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  "#c4704a", "#5f1b29", "#8a3040", "#056b63", "#9a6a28",
  "#6E40C9", "#1DB954", "#F24E1E", "#7a9b76", "#2a1a10",
  "#007AFF", "#E50914",
]

// ─── Component ────────────────────────────────────────────────────────────────

interface CategoryManagerProps {
  open: boolean
  onClose: () => void
  userId: string
}

export function CategoryManager({ open, onClose, userId }: CategoryManagerProps) {
  const categories = useExpensesStore((s) => s.categories)
  const subscriptions = useExpensesStore((s) => s.subscriptions)
  const addCategory = useExpensesStore((s) => s.addCategory)
  const editCategory = useExpensesStore((s) => s.editCategory)
  const removeCategory = useExpensesStore((s) => s.removeCategory)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("zap")
  const [color, setColor] = useState("#5f1b29")
  const [iconSearch, setIconSearch] = useState("")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) return ICON_LIBRARY
    const q = iconSearch.toLowerCase()
    return ICON_LIBRARY.filter(
      (ic) => ic.label.toLowerCase().includes(q) || ic.name.toLowerCase().includes(q)
    )
  }, [iconSearch])

  const resetForm = () => {
    setName("")
    setIcon("zap")
    setColor("#4A7A9B")
    setIconSearch("")
    setShowForm(false)
    setEditingId(null)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    if (editingId) {
      await editCategory(editingId, { name: name.trim(), icon, color })
    } else {
      await addCategory({ user_id: userId, name: name.trim(), icon, color })
    }
    resetForm()
  }

  const handleEdit = (cat: ExpenseCategory) => {
    setEditingId(cat.id)
    setName(cat.name)
    setIcon(cat.icon)
    setColor(cat.color)
    setIconSearch("")
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const hasSubs = subscriptions.some((s) => s.category_id === id)
    if (hasSubs && confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }
    await removeCategory(id)
    setConfirmDeleteId(null)
  }

  return (
    <Modal open={open} onClose={onClose} title="Gestionar categorias" className="max-w-md">
      <div className="space-y-4">

        {/* ── Category list ── */}
        <div className="space-y-1">
          {categories.length === 0 && (
            <p className="text-sm text-text-tertiary text-center py-4">
              No hay categorias creadas
            </p>
          )}
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sand"
            >
              {/* Icon bubble */}
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: `${cat.color}18` }}
              >
                {renderIconByName(cat.icon, 13, cat.color) ?? (
                  <span className="text-xs font-medium" style={{ color: cat.color }}>
                    {cat.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Name */}
              <span className="flex-1 text-sm text-foreground">{cat.name}</span>

              {/* Color dot */}
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color }}
              />

              {/* Actions */}
              <button
                onClick={() => handleEdit(cat)}
                className="text-text-tertiary hover:text-foreground transition-colors"
              >
                <Pencil size={13} strokeWidth={1.75} />
              </button>
              <button
                onClick={() => handleDelete(cat.id)}
                className="text-text-tertiary hover:text-red-600 transition-colors"
              >
                <Trash2 size={13} strokeWidth={1.75} />
              </button>

              {confirmDeleteId === cat.id && (
                <span className="text-[11px] text-red-600 flex-shrink-0">
                  Tiene suscripciones. Pulsa de nuevo.
                </span>
              )}
            </div>
          ))}
        </div>

        {/* ── Form ── */}
        {showForm ? (
          <div className="space-y-3 border-t border-border pt-4">
            <Input
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la categoria"
            />

            {/* Icon picker */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">Icono</label>
                {/* Selected preview */}
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
                  style={{
                    backgroundColor: `${color}18`,
                    border: `1px solid ${color}40`,
                  }}
                >
                  {renderIconByName(icon, 13, color)}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search
                  size={12}
                  strokeWidth={1.75}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
                />
                <input
                  type="text"
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  placeholder="Buscar icono..."
                  className="w-full rounded-md border border-border bg-card pl-7 pr-3 py-1.5 text-xs text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors"
                />
              </div>

              {/* Icon grid */}
              <div className="grid grid-cols-9 gap-1 max-h-40 overflow-y-auto pr-0.5">
                {filteredIcons.map(({ name: icName, label, Icon: IconComp }) => (
                  <button
                    key={icName}
                    title={label}
                    onClick={() => setIcon(icName)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border transition-all ${
                      icon === icName
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-card text-text-tertiary hover:border-border hover:bg-sand hover:text-text-secondary"
                    }`}
                  >
                    <IconComp size={15} strokeWidth={1.75} />
                  </button>
                ))}
                {filteredIcons.length === 0 && (
                  <span className="col-span-9 text-center text-xs text-text-tertiary py-3">
                    Sin resultados
                  </span>
                )}
              </div>
            </div>

            {/* Color presets */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Color</label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      color === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X size={14} strokeWidth={1.75} />
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave}>
                <Check size={14} strokeWidth={1.75} />
                {editingId ? "Guardar" : "Crear"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowForm(true)}
            className="w-full"
          >
            <Plus size={14} strokeWidth={1.75} />
            Nueva categoria
          </Button>
        )}
      </div>
    </Modal>
  )
}
