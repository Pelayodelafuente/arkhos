"use client"

import { useState } from "react"
import { Plus, Trash2, Pencil, X, Check } from "lucide-react"
import { Modal, Button, Input } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import type { ExpenseCategory } from "@/types/expenses"

// Lucide icon names available for categories
const CATEGORY_ICONS = [
  "tv", "code", "cloud", "music", "zap", "hard-drive",
  "gamepad-2", "book", "camera", "globe", "shield", "heart",
]

const COLOR_PRESETS = [
  "#E50914", "#6e40c9", "#3693F5", "#1DB954", "#000000",
  "#0572EC", "#F24E1E", "#FF6363", "#4A7A9B", "#9B7A4A",
  "#5B8C6A", "#C4704A",
]

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
  const [color, setColor] = useState("#4A7A9B")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const resetForm = () => {
    setName("")
    setIcon("zap")
    setColor("#4A7A9B")
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
    <Modal
      open={open}
      onClose={onClose}
      title="Gestionar categorias"
      className="max-w-md"
    >
      <div className="space-y-4">
        {/* Category list */}
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
              {/* Icon + Color */}
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: `${cat.color}1A` }}
              >
                <span className="text-xs" style={{ color: cat.color }}>
                  {cat.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Name */}
              <span className="flex-1 text-sm text-foreground">{cat.name}</span>

              {/* Color swatch */}
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

        {/* New/Edit form */}
        {showForm ? (
          <div className="space-y-3 border-t border-border pt-4">
            <Input
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la categoria"
            />

            {/* Icon selector */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-secondary">Icono</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_ICONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs transition-colors ${
                      icon === ic
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-card text-text-secondary hover:border-accent"
                    }`}
                  >
                    {ic.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Color presets */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-secondary">Color</label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      color === c ? "border-foreground scale-110" : "border-transparent"
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
