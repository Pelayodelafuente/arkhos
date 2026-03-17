"use client"

import type { SubscriptionWithCategory } from "@/types/expenses"
import { Badge } from "@/components/ui"
import { findServiceById } from "@/data/subscriptionServices"

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
})

interface ExpensePopupContentProps {
  day: number
  month: number
  year: number
  subscriptions: SubscriptionWithCategory[]
}

export function ExpensePopupContent({
  day,
  month,
  year,
  subscriptions,
}: ExpensePopupContentProps) {
  const monthName = MONTH_NAMES[month - 1] ?? ""
  const total = subscriptions.reduce((acc, sub) => acc + sub.amount, 0)

  return (
    <div className="min-w-[220px]">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-border pb-3 mb-3">
        <span className="font-heading text-lg text-foreground">
          {day} de {monthName}
        </span>
        <span className="font-mono text-sm text-accent font-semibold">
          {currencyFormatter.format(total)}
        </span>
      </div>

      {/* Subscriptions list */}
      <div className="max-h-[240px] overflow-y-auto space-y-1">
        {subscriptions.map((sub) => (
          <SubscriptionRow key={sub.id} subscription={sub} />
        ))}
      </div>
    </div>
  )
}

function SubscriptionRow({ subscription }: { subscription: SubscriptionWithCategory }) {
  const service = findServiceById(subscription.icon)
  const IconComponent = service?.icon

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[rgba(240,235,225,0.5)]">
      {/* Icon */}
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${subscription.color}15` }}
      >
        {IconComponent ? (
          <IconComponent width={18} height={18} />
        ) : (
          <span
            className="text-xs font-semibold"
            style={{ color: subscription.color }}
          >
            {subscription.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name + Badge */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground truncate">
          {subscription.name}
        </p>
        <Badge variant={subscription.cycle === "monthly" ? "blue" : "gold"}>
          {subscription.cycle === "monthly" ? "Mensual" : "Anual"}
        </Badge>
      </div>

      {/* Amount */}
      <span className="font-mono text-[13px] text-foreground flex-shrink-0">
        {currencyFormatter.format(subscription.amount)}
      </span>
    </div>
  )
}
