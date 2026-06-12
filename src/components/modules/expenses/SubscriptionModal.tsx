"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Play, PauseCircle, Trash2, AlertTriangle, Upload, X, ChevronDown } from "lucide-react"
import { z } from "zod/v4"
import { Modal, Button, Input, Textarea } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import type { SubscriptionWithCategory, BillingCycle } from "@/types/expenses"
import type { SubscriptionService } from "@/data/subscriptionServices"
import { ServicesCombobox } from "./ServicesCombobox"
import { CustomSelect } from "./CustomSelect"
import type { CustomSelectOption } from "./CustomSelect"
import { ICON_MAP } from "./CategoryManager"
import { findDuplicates } from "@/lib/duplicate-detection"
import { Calendar, CalendarDays } from "lucide-react"

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
  const [color, setColor] = useState("#3B78B0")
  const [amount, setAmount] = useState("")
  const [cycle, setCycle] = useState<BillingCycle>("monthly")
  const [billingDay, setBillingDay] = useState("1")
  const [categoryId, setCategoryId] = useState("")
  const [url, setUrl] = useState("")
  const [notes, setNotes] = useState("")
  const [startedAt, setStartedAt] = useState("")
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dismissedDuplicates, setDismissedDuplicates] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
    setIconUrl(null)
    setErrors({})
    setConfirmDelete(false)
    setDismissedDuplicates(false)
  }, [])

  // ── Populate on edit ────────────────

  const [prevSync, setPrevSync] = useState<{
    subscription: SubscriptionWithCategory | null | undefined
    open: boolean
    prefilledDay: number | null | undefined
  } | null>(null)

  if (
    !prevSync ||
    prevSync.subscription !== subscription ||
    prevSync.open !== open ||
    prevSync.prefilledDay !== prefilledDay
  ) {
    setPrevSync({ subscription, open, prefilledDay })
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
      setIconUrl(subscription.icon_url ?? null)
    } else {
      resetForm()
    }
    if (prefilledDay !== null && prefilledDay !== undefined) {
      setBillingDay(String(prefilledDay))
    }
  }

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

  // ── Auto-favicon from URL (debounced 500ms) ─
  useEffect(() => {
    if (iconUrl) return // manual upload takes priority, don't overwrite
    if (!url) return
    const timer = setTimeout(() => {
      try {
        const domain = new URL(url).hostname
        if (domain) setIconUrl(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`)
      } catch {
        // invalid URL — ignore
      }
    }, 500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  // ── Manual logo upload ──────────────
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result
      if (typeof result === 'string') setIconUrl(result)
    }
    reader.readAsDataURL(file)
    // Reset input so the same file can be re-uploaded
    e.target.value = ''
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
      icon_url: iconUrl || null,
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

  const cycleOptions: CustomSelectOption[] = [
    { value: "monthly", label: "Mensual", icon: <Calendar size={13} strokeWidth={1.75} /> },
    { value: "annual", label: "Anual", icon: <CalendarDays size={13} strokeWidth={1.75} /> },
  ]

  const dayOptions: CustomSelectOption[] = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }))

  const categoryOptions: CustomSelectOption[] = [
    { value: "", label: "Sin categoría" },
    ...categories.map((c) => {
      const IconComp = ICON_MAP[c.icon]
      return {
        value: c.id,
        label: c.name,
        color: c.color,
        icon: IconComp ? <IconComp size={13} strokeWidth={1.5} /> : undefined,
      }
    }),
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

        {/* Color + Logo upload */}
        <div className="flex items-end gap-4">
          {/* Color — hidden when logo is present */}
          {!iconUrl && (
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
          )}

          {/* Logo upload circle */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-secondary">Logo</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative h-12 w-12 rounded-full border-2 border-dashed border-border bg-card hover:border-accent hover:bg-sand transition-colors flex items-center justify-center overflow-hidden cursor-pointer"
                title="Subir logo"
              >
                {iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={iconUrl} alt="logo" className="h-full w-full object-contain p-1 rounded-full" />
                ) : (
                  <Upload size={14} strokeWidth={1.75} className="text-text-tertiary" />
                )}
              </button>
              {iconUrl && (
                <button
                  type="button"
                  onClick={() => setIconUrl(null)}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-sand hover:bg-border transition-colors cursor-pointer"
                  title="Quitar logo"
                >
                  <X size={10} strokeWidth={2} className="text-text-tertiary" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
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
          <CustomSelect
            label="Ciclo"
            options={cycleOptions}
            value={cycle}
            onChange={(v) => setCycle(v as BillingCycle)}
          />
        </div>

        {/* Billing day + Category */}
        <div className="grid grid-cols-2 gap-3">
          <CustomSelect
            label="Día de cobro"
            options={dayOptions}
            value={billingDay}
            onChange={setBillingDay}
            variant="grid"
          />
          <CustomSelect
            label="Categoría"
            options={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
          />
        </div>

        {/* URL */}
        <Input
          label="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
        />

        {/* Notes — collapsible */}
        <div>
          <button
            type="button"
            onClick={() => setNotesOpen((o) => !o)}
            className="flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-foreground transition-colors cursor-pointer mb-1"
          >
            <ChevronDown
              size={14}
              strokeWidth={1.75}
              className={`transition-transform duration-200 ${notesOpen ? '' : '-rotate-90'}`}
            />
            Notas
            {notes && !notesOpen && (
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-accent" />
            )}
          </button>
          {notesOpen && (
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas personales..."
              rows={2}
            />
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
          <div className="border-t border-border pt-4 space-y-3">
            {/* Pause/activate + Delete row */}
            {!confirmDelete && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleActive}
                  className="border border-border cursor-pointer"
                >
                  {subscription.is_active ? (
                    <>
                      <PauseCircle size={14} strokeWidth={1.75} />
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
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                  Eliminar
                </Button>
              </div>
            )}

            {/* Confirm delete panel */}
            {confirmDelete && (
              <div
                className="rounded-xl border border-[var(--module-gastos)]/20 bg-[var(--module-gastos)]/5 p-3 space-y-2"
                style={{ animation: 'fade-in 150ms ease-out, scale-in 150ms ease-out' }}
              >
                <p className="text-xs text-text-secondary">
                  ¿Eliminar <span className="font-semibold text-foreground">{subscription.name}</span>? Esta acción no se puede deshacer.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-md px-3 py-1.5 text-xs font-medium border border-border bg-card text-text-secondary hover:bg-sand transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    loading={saving}
                  >
                    <Trash2 size={13} strokeWidth={1.75} />
                    Eliminar
                  </Button>
                </div>
              </div>
            )}
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
