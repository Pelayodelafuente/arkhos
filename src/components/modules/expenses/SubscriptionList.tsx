"use client"

import { useState } from "react"
import { CreditCard, MoreHorizontal, Plus } from "lucide-react"
import { motion } from "framer-motion"
import { Card, Badge, Button } from "@/components/ui"
import {
  useExpensesStore,
  useFilteredSubscriptions,
} from "@/stores/expenses-store"
import { findServiceById } from "@/data/subscriptionServices"
import type { SubscriptionWithCategory } from "@/types/expenses"

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
})

interface SubscriptionListProps {
  onEdit: (subscription: SubscriptionWithCategory) => void
  onNew: () => void
}

export function SubscriptionList({ onEdit, onNew }: SubscriptionListProps) {
  const filtered = useFilteredSubscriptions()
  const setSelectedDay = useExpensesStore((s) => s.setSelectedDay)

  if (filtered.length === 0) {
    return <EmptyState onNew={onNew} />
  }

  return (
    <div>
      {/* Eyebrow */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-4 w-0.5 rounded-full bg-accent" />
        <span className="font-mono text-[10px] tracking-[0.08em] text-accent">
          TODAS LAS SUSCRIPCIONES
        </span>
      </div>

      <Card padding="sm" className="divide-y divide-border">
        {filtered.map((sub, i) => (
          <motion.div
            key={sub.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
          >
            <SubscriptionRow
              subscription={sub}
              onEdit={() => onEdit(sub)}
              onDayClick={() => setSelectedDay(sub.billing_day)}
            />
          </motion.div>
        ))}
      </Card>
    </div>
  )
}

function SubscriptionRow({
  subscription,
  onEdit,
  onDayClick,
}: {
  subscription: SubscriptionWithCategory
  onEdit: () => void
  onDayClick: () => void
}) {
  const service = findServiceById(subscription.icon)
  const IconComponent = service?.icon

  return (
    <div
      className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-[rgba(240,235,225,0.35)] cursor-pointer"
      onClick={onDayClick}
    >
      {/* Billing day */}
      <span className="font-mono text-[11px] text-text-tertiary min-w-[24px] text-right flex-shrink-0">
        {subscription.billing_day}
      </span>

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

      {/* Name */}
      <span className="text-[13px] font-semibold text-foreground truncate min-w-0 flex-1">
        {subscription.name}
      </span>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Badge variant={subscription.cycle === "monthly" ? "blue" : "gold"}>
          {subscription.cycle === "monthly" ? "Mensual" : "Anual"}
        </Badge>
        {!subscription.is_active && (
          <Badge variant="gray">Pausada</Badge>
        )}
      </div>

      {/* Amount */}
      <span className="font-mono text-[13px] text-foreground text-right min-w-[72px] flex-shrink-0">
        {currencyFormatter.format(subscription.amount)}
      </span>

      {/* Edit button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onEdit()
        }}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-sand hover:text-foreground"
      >
        <MoreHorizontal size={14} strokeWidth={1.75} />
      </button>
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <CreditCard
        size={48}
        strokeWidth={1}
        className="text-text-tertiary mb-4"
      />
      <p className="font-heading text-lg text-foreground mb-2">
        Aun no tienes suscripciones
      </p>
      <p className="text-sm text-text-tertiary mb-6">
        Registra tus gastos recurrentes para tener control total
      </p>
      <Button variant="primary" onClick={onNew}>
        <Plus size={16} strokeWidth={1.75} />
        Anadir suscripcion
      </Button>
    </div>
  )
}
