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
  const [color, setColor] = useState("#4A7A9B")
  const [amount, setAmount] = useState("")
  const [cycle, setCycle] = useState<BillingCycle>("monthly")
  const [billingDay, setBillingDay] = useState("1")
  const [categoryId, setCategoryId] = useState("")
  const [url, setUrl] = useState("")
  const [notes, setNotes] = useState("")
  const [startedAt, setStartedAt] = useState("")
  const [currency, setCurrency] = useState("EUR")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dismissedDuplicates, setDismissedDuplicates] = useState(false)

  // Collect all existing tags for autocomplete
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const sub of subscriptions) {
      if (sub.tags) {
        for (const t of sub.tags) tagSet.add(t)
      }
    }
    return Array.from(tagSet).sort()
  }, [subscriptions])

  const tagSuggestions = useMemo(() => {
    if (!tagInput.trim()) return []
    const q = tagInput.toLowerCase()
    return allTags.filter(
      (t) => t.toLowerCase().includes(q) && !tags.includes(t)
    ).slice(0, 5)
  }, [tagInput, allTags, tags])

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
    setCurrency("EUR")
    setTags([])
    setTagInput("")
    setErrors({})
    setConfirmDelete(false)
    setDismissedDuplicates(false)
  }, [])

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
      setCurrency(subscription.currency ?? "EUR")
      setTags(subscription.tags ?? [])
      setTagInput("")
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
      currency,
      cycle,
      billing_day: parseInt(billingDay, 10),
      category_id: categoryId || null,
      url: url || null,
      notes: notes || null,
      started_at: startedAt || null,
      tags,
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

  const currencyOptions = [
    { value: "EUR", label: "EUR" },
    { value: "USD", label: "USD" },
    { value: "GBP", label: "GBP" },
  ]

  const cycleOptions = [
    { value: "monthly", label: "Mensual" },
    { value: "quarterly", label: "Trimestral" },
    { value: "semiannual", label: "Semestral" },
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
                className="mt-1.5 text-[11px] font-medium text-amber-600 hover:text-amber-800 underline"
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

        {/* Amount + Currency + Cycle */}
        <div className="grid grid-cols-[1fr_80px_1fr] gap-3">
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
            label="Divisa"
            options={currencyOptions}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
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

        {/* Tags */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-secondary">Etiquetas</label>
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 min-h-[38px] focus-within:border-accent">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-sand px-2 py-0.5 text-xs text-foreground"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  className="text-text-tertiary hover:text-foreground transition-colors"
                >
                  &times;
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                  e.preventDefault()
                  const newTag = tagInput.trim().replace(/,/g, '')
                  if (newTag && !tags.includes(newTag)) {
                    setTags([...tags, newTag])
                  }
                  setTagInput("")
                }
                if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                  setTags(tags.slice(0, -1))
                }
              }}
              placeholder={tags.length === 0 ? "Añadir etiqueta..." : ""}
              className="flex-1 min-w-[80px] bg-transparent text-sm text-foreground placeholder:text-text-tertiary outline-none"
            />
          </div>
          {tagSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tagSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (!tags.includes(s)) setTags([...tags, s])
                    setTagInput("")
                  }}
                  className="rounded-full bg-sand/70 px-2 py-0.5 text-[11px] text-text-secondary hover:bg-sand hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

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
              className="border border-border"
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
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              loading={saving && confirmDelete}
            >
              <Trash2 size={14} strokeWidth={1.75} />
              {confirmDelete ? "Confirmar eliminacion" : "Eliminar"}
            </Button>
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
