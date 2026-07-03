"use client"

import { useState, useCallback, useMemo } from "react"
import { Sparkles, Check, AlertCircle, AlertTriangle } from "lucide-react"
import { Modal, Button, Badge } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import { parseSmartAdd, isSmartAddComplete } from "@/lib/smart-add-parser"
import { findServiceByName } from "@/data/subscriptionServices"
import { findDuplicates } from "@/lib/duplicate-detection"
import { ServiceAvatar } from "./ServiceAvatar"
import { formatCurrency, getCycleShortLabel } from "@/lib/gastos-utils"

interface SmartAddModalProps {
  open: boolean
  onClose: () => void
  userId: string
}

export function SmartAddModal({ open, onClose, userId }: SmartAddModalProps) {
  const [input, setInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [dismissedDuplicates, setDismissedDuplicates] = useState(false)
  const addSubscription = useExpensesStore((s) => s.addSubscription)
  const subscriptions = useExpensesStore((s) => s.subscriptions)

  const parsed = useMemo(() => parseSmartAdd(input), [input])
  const complete = isSmartAddComplete(parsed)
  const matchedService = parsed.name ? findServiceByName(parsed.name) : undefined

  // Duplicate detection
  const duplicates = useMemo(() => {
    if (!parsed.name || dismissedDuplicates) return []
    return findDuplicates(
      subscriptions,
      parsed.name,
      parsed.amount ?? undefined,
      matchedService?.id
    )
  }, [parsed.name, parsed.amount, matchedService, subscriptions, dismissedDuplicates])

  const handleCreate = useCallback(async () => {
    if (!complete || !parsed.name || !parsed.amount) return

    setSaving(true)
    try {
      await addSubscription({
        user_id: userId,
        name: matchedService?.name ?? parsed.name,
        icon: matchedService?.id ?? parsed.name.toLowerCase().replace(/\s+/g, '-'),
        color: matchedService?.color ?? 'var(--module-gastos)',
        amount: parsed.amount,
        cycle: parsed.cycle ?? 'monthly',
        billing_day: parsed.billingDay ?? 1,
        status: 'active',
      })
      setInput("")
      setDismissedDuplicates(false)
      onClose()
    } finally {
      setSaving(false)
    }
  }, [complete, parsed, matchedService, addSubscription, userId, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && complete) {
      handleCreate()
    }
  }

  const getCycleBadgeVariant = (cycle: string): "blue" | "gold" | "terracotta" | "green" => {
    switch (cycle) {
      case 'monthly': return 'blue'
      case 'quarterly': return 'terracotta'
      case 'semiannual': return 'green'
      case 'annual': return 'gold'
      default: return 'blue'
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Smart Add" className="max-w-md">
      <div className="space-y-4">
        {/* Input */}
        <div className="relative">
          <Sparkles
            size={15}
            strokeWidth={1.75}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-accent"
          />
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setDismissedDuplicates(false) }}
            onKeyDown={handleKeyDown}
            placeholder='Ej: Netflix 17.99 mensual día 1'
            className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            autoFocus
          />
        </div>

        {/* Help text */}
        <p className="text-[11px] text-text-tertiary leading-relaxed">
          Escribe el nombre, precio, ciclo (mensual/anual), día de cobro y categoría.
          <br />
          Ejemplo: <span className="font-mono">Spotify 10.99 mensual día 15 en Música</span>
        </p>

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

        {/* Preview */}
        {parsed.name && (
          <div className="rounded-xl border border-border bg-sand/50 p-4">
            <div className="flex items-center gap-3">
              <ServiceAvatar
                name={matchedService?.name ?? parsed.name}
                icon={matchedService?.id ?? ''}
                color={matchedService?.color ?? 'var(--module-gastos)'}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {matchedService?.name ?? parsed.name}
                  </span>
                  {matchedService && (
                    <Check size={12} className="text-emerald-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {parsed.amount !== null && (
                    <span className="font-mono text-xs text-foreground">
                      {formatCurrency(parsed.amount)}
                    </span>
                  )}
                  {parsed.cycle && (
                    <Badge variant={getCycleBadgeVariant(parsed.cycle)}>
                      {getCycleShortLabel(parsed.cycle)}
                    </Badge>
                  )}
                  {parsed.billingDay !== null && (
                    <span className="text-xs text-text-tertiary">
                      Día {parsed.billingDay}
                    </span>
                  )}
                  {parsed.category && (
                    <span className="text-xs text-text-tertiary">
                      {parsed.category}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Missing fields */}
            {!complete && (
              <div className="mt-3 flex items-center gap-1.5 text-amber-600">
                <AlertCircle size={12} strokeWidth={2} />
                <span className="text-[11px]">
                  Falta: {!parsed.name ? 'nombre, ' : ''}{!parsed.amount ? 'precio' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            loading={saving}
            disabled={!complete}
          >
            <Sparkles size={14} strokeWidth={1.75} />
            Crear
          </Button>
        </div>
      </div>
    </Modal>
  )
}
