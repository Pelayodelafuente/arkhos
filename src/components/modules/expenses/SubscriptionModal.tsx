"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Play, Pause, Trash2, AlertTriangle } from "lucide-react"
import { z } from "zod/v4"
import { Modal, Button, Input, Select, Textarea } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import type { SubscriptionWithCategory, BillingCycle } from "@/types/expenses"
import type { SubscriptionService } from "@/data/subscriptionServices"
import { ServicesCombobox } from "./ServicesCombobox"
import { findDuplicates } from "@/lib/duplicate-detection"

// ── Zod schema ──────────────────────────

const subscriptionSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  icon: z.string().min(1),
  color: z.string().min(1),
  amount: z.number().positive("El importe debe ser mayor que 0"),
  cycle: z.enum(["monthly", "quarterly", "semiannual", "annual"]),
  billing_day: z.number().int().min(1).max(31),
  category_id: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
})

// ── Component ───────────────────────────

interface SubscriptionModalProps {
  open: boolean
  onClose: () => void
  userId: string
  subscription?: SubscriptionWithCategory | null
  prefilledDay?: number | null
}

export function SubscriptionModal({
  open,
  onClose,
  userId,
  subscription,
  prefilledDay,
}: SubscriptionModalProps) {
  const addSubscription = useExpensesStore((s) => s.addSubscription)
  const editSubscription = useExpensesStore((s) => s.editSubscription)
  const removeSubscription = useExpensesStore((s) => s.removeSubscription)
  const toggleActive = useExpensesStore((s) => s.toggleActive)
  const categories = useExpensesStore((s) => s.categories)
  const subscriptions = useExpensesStore((s) => s.subscriptions)

  const isEdit = Boolean(subscription)

  // ── Form state ──────────────────────

  const [name, setName] = useState("")
  const [icon, setIcon] = useState("")
  const [color, setColor] = useState("#5f1b29")
  const [amount, setAmount] = useState("")
  const [cycle, setCycle] = useState<BillingCycle>("monthly")
  const [billingDay, setBillingDay] = useState("1")
  const [categoryId, setCategoryId] = useState("")
  const [url, setUrl] = useState("")
  const [notes, setNotes] = useState("")
  const [startedAt, setStartedAt] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dismissedDuplicates, setDismissedDuplicates] = useState(false)

  // ── Duplicate detection ───────────

  const duplicates = useMemo(() => {
    if (isEdit || !name || dismissedDuplicates) return []
    return findDuplicates(
      subscriptions,
      name,
      parseFloat(amount) || undefined,
      icon || undefined
    )
  }, [isEdit, name, amount, icon, subscriptions, dismissedDuplicates])

  const resetForm = useCallback(() => {
    setName("")
    setIcon("")
    setColor("#4A7A9B")
    setAmount("")
    setCycle("monthly")
    setBillingDay("1")
    setCategoryId("")
    setUrl("")
    setNotes("")
    setStartedAt("")
    setErrors({})
    setConfirmDelete(false)
    setDismissedDuplicates(false)
  }, [])

  // ── Populate on edit ────────────────

  useEffect(() => {
    if (subscription) {
      setName(subscription.name)
      setIcon(subscription.icon)
      setColor(subscription.color)
      setAmount(String(subscription.amount))
      setCycle(subscription.cycle)
      setBillingDay(String(subscription.billing_day))
      setCategoryId(subscription.category_id ?? "")
      setUrl(subscription.url ?? "")
      setNotes(subscription.notes ?? "")
      setStartedAt(subscription.started_at ?? "")
    } else {
      resetForm()
    }
    if (prefilledDay !== null && prefilledDay !== undefined) {
      setBillingDay(String(prefilledDay))
    }
  }, [subscription, open, prefilledDay, resetForm])

  // ── Service selection ───────────────

  const handleServiceSelect = (service: SubscriptionService | null) => {
    if (service) {
      setName(service.name)
      setIcon(service.id)
      setColor(service.color)
    } else {
      setIcon("")
    }
  }

  // ── Submit ──────────────────────────

  const handleSubmit = async () => {
    const data = {
      name,
      icon: icon || name.toLowerCase().replace(/\s+/g, "-"),
      color,
      amount: parseFloat(amount) || 0,
      cycle,
      billing_day: parseInt(billingDay, 10),
      category_id: categoryId || null,
      url: url || null,
      notes: notes || null,
      started_at: startedAt || null,
    }

    const result = subscriptionSchema.safeParse(data)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const path = issue.path[0]
        if (typeof path === "string") {
          fieldErrors[path] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setSaving(true)
    setErrors({})

    try {
      if (isEdit && subscription) {
        await editSubscription(subscription.id, data)
      } else {
        await addSubscription({ ...data, user_id: userId })
      }
      onClose()
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──────────────────────────

  const handleDelete = async () => {
    if (!subscription) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSaving(true)
    await removeSubscription(subscription.id)
    setSaving(false)
    onClose()
    resetForm()
  }

  // ── Toggle active ───────────────────

  const handleToggleActive = async () => {
    if (!subscription) return
    await toggleActive(subscription.id)
    onClose()
  }

  // ── Select options ──────────────────

  const cycleOptions = [
    { value: "monthly", label: "Mensual" },
    { value: "annual", label: "Anual" },
  ]

  const dayOptions = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }))

  const categoryOptions = [
    { value: "", label: "Sin categoria" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Editar ${subscription?.name ?? ""}` : "Nueva suscripción"}
      className="max-w-md"
    >
      <div className="space-y-4">
        {/* Duplicate warning */}
        {duplicates.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle size={16} strokeWidth={1.75} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-800 mb-1">Posible duplicado</p>
              {duplicates.map((dup) => (
                <p key={dup.subscription.id} className="text-[11px] text-amber-700 truncate">
                  {dup.subscription.name} — {dup.reason}
                </p>
              ))}
              <button
                onClick={() => setDismissedDuplicates(true)}
                className="mt-1.5 text-[11px] font-medium text-amber-600 hover:text-amber-800 underline cursor-pointer"
              >
                Ignorar
              </button>
            </div>
          </div>
        )}

        {/* Service combobox */}
        <ServicesCombobox
          value={isEdit ? name : ""}
          onSelect={handleServiceSelect}
        />

        {/* Name */}
        <Input
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder="Nombre del servicio"
        />

        {/* Color */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-secondary">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded-md border border-border bg-card"
            />
            <span className="font-mono text-xs text-text-tertiary">{color}</span>
          </div>
        </div>

        {/* Amount + Cycle */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Importe"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={errors.amount}
            placeholder=""
          />
          <Select
            label="Ciclo"
            options={cycleOptions}
            value={cycle}
            onChange={(e) => setCycle(e.target.value as BillingCycle)}
          />
        </div>

        {/* Billing day + Category */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Dia de cobro"
            options={dayOptions}
            value={billingDay}
            onChange={(e) => setBillingDay(e.target.value)}
          />
          <Select
            label="Categoria"
            options={categoryOptions}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          />
        </div>

        {/* URL */}
        <Input
          label="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
        />

        {/* Notes */}
        <Textarea
          label="Notas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas personales..."
          rows={2}
        />

        {/* Start date */}
        <Input
          label="Fecha de inicio"
          type="date"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
        />

        {/* Edit-only actions */}
        {isEdit && subscription && (
          <div className="flex items-center gap-2 border-t border-border pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleActive}
              className="border border-border cursor-pointer"
            >
              {subscription.is_active ? (
                <>
                  <Pause size={14} strokeWidth={1.75} />
                  Pausar
                </>
              ) : (
                <>
                  <Play size={14} strokeWidth={1.75} />
                  Activar
                </>
              )}
            </Button>
            <button
              onClick={handleDelete}
              disabled={saving && confirmDelete}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer border border-border
                ${confirmDelete
                  ? 'bg-[#C4704A]/10 text-[#C4704A] border-[#C4704A]/30'
                  : 'text-foreground/60 hover:bg-sand hover:text-foreground/90 hover:border-stone/50'
                }`}
            >
              {saving && confirmDelete && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              <Trash2 size={14} strokeWidth={1.75} />
              {confirmDelete ? "Confirmar eliminacion" : "Eliminar"}
            </button>
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving && !confirmDelete}>
            {isEdit ? "Guardar" : "Crear"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
