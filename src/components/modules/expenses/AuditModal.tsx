"use client"

import { useState, useMemo } from "react"
import { Modal } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import { ServiceAvatar } from "./ServiceAvatar"
import { formatCurrency, getAnnualizedAmount } from "@/lib/gastos-utils"

interface AuditModalProps {
  open: boolean
  onClose: () => void
}

const STORAGE_KEY = 'arkhos-gastos-dispensable'

function getDispensable(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function saveDispensable(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

export function AuditModal({ open, onClose }: AuditModalProps) {
  const subscriptions = useExpensesStore((s) => s.subscriptions)
  const [dispensable, setDispensable] = useState<Set<string>>(getDispensable)

  const sorted = useMemo(() => {
    return [...subscriptions]
      .filter((s) => s.status === 'active')
      .sort((a, b) => getAnnualizedAmount(b) - getAnnualizedAmount(a))
  }, [subscriptions])

  const totalAnnualized = sorted.reduce((acc, s) => acc + getAnnualizedAmount(s), 0)
  const savingsIfCancelled = sorted
    .filter((s) => dispensable.has(s.id))
    .reduce((acc, s) => acc + getAnnualizedAmount(s), 0)

  const toggleDispensable = (id: string) => {
    setDispensable((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveDispensable(next)
      return next
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Auditoría de gastos" className="max-w-lg">
      <div className="space-y-4">
        {/* Summary */}
        {dispensable.size > 0 && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <span className="text-sm text-emerald-700">
              Si cancelaras las marcadas, ahorrarías{' '}
              <span className="font-mono font-semibold">{formatCurrency(savingsIfCancelled)}</span>/año
            </span>
          </div>
        )}

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {sorted.map((sub, i) => {
            const annualized = getAnnualizedAmount(sub)
            const pct = totalAnnualized > 0 ? (annualized / totalAnnualized) * 100 : 0
            const isMarked = dispensable.has(sub.id)

            return (
              <div
                key={sub.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors cursor-pointer ${
                  isMarked ? 'bg-emerald-50/50' : 'hover:bg-sand/30'
                }`}
                onClick={() => toggleDispensable(sub.id)}
              >
                <span className="font-mono text-xs text-text-tertiary w-6 text-right flex-shrink-0">
                  #{i + 1}
                </span>
                <ServiceAvatar name={sub.name} icon={sub.icon} color={sub.color} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-semibold text-foreground ${isMarked ? 'line-through' : ''}`}>
                    {sub.name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-foreground">{formatCurrency(annualized)}/año</span>
                    <span className="font-mono text-[10px] text-text-tertiary">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-sand overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--module-gastos)]"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isMarked}
                  onChange={() => toggleDispensable(sub.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent flex-shrink-0"
                />
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
