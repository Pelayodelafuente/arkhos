"use client"

import type { SubscriptionWithCategory } from "@/types/expenses"
import { ServiceAvatar } from "./ServiceAvatar"
import { formatCurrency } from "@/lib/gastos-utils"

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

interface ExpensePopupContentProps {
  day: number
  month: number
  year: number
  subscriptions: SubscriptionWithCategory[]
  onClose?: () => void
}

export function ExpensePopupContent({
  day,
  month,
  subscriptions,
  onClose,
}: ExpensePopupContentProps) {
  const monthName = MONTH_NAMES[month - 1] ?? ""
  const total = subscriptions.reduce((acc, sub) => acc + sub.amount, 0)

  return (
    <div className="min-w-[260px] max-w-[320px]">
      {/* Header */}
      <div className="flex items-baseline justify-between bg-sand/50 px-4 py-3 border-b border-border">
        <span className="font-heading text-lg text-foreground">
          {day} de {monthName}
        </span>
        <span className="font-mono text-sm text-accent font-semibold">
          {formatCurrency(total)}
        </span>
      </div>

      {/* Items */}
      <div className="max-h-[280px] overflow-y-auto overscroll-contain">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sand/30"
          >
            <ServiceAvatar
              name={sub.name}
              icon={sub.icon}
              color={sub.color}
              size="sm"
              iconUrl={sub.icon_url}
              url={sub.url}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate block">
                {sub.name}
              </span>
              <span className="text-xs text-text-tertiary">
                {sub.category?.name ?? 'Sin categoría'}
              </span>
            </div>
            <span className="font-mono text-sm text-foreground flex-shrink-0">
              {formatCurrency(sub.amount)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      {onClose && (
        <div className="border-t border-border px-4 py-2">
          <button
            onClick={onClose}
            className="text-xs text-[var(--module-gastos)] hover:text-accent transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  )
}
