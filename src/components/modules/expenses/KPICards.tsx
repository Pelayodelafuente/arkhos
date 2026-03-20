"use client"

import { useMemo } from "react"
import { Wallet, CalendarClock, FolderOpen, RotateCcw } from "lucide-react"
import { Card } from "@/components/ui"
import { useExpensesStore, useExpenseSummary } from "@/stores/expenses-store"
import { formatCurrency, getNextBillingSubscription, getMostExpensiveCategory, getNextAnnualRenewal, getDaysUntilBilling } from "@/lib/gastos-utils"
import { ServiceAvatar } from "./ServiceAvatar"

export function KPICards() {
  const subscriptions = useExpensesStore((s) => s.subscriptions)
  const notAmortizeYearly = useExpensesStore((s) => s.notAmortizeYearly)
  const summary = useExpenseSummary()

  const nextBilling = useMemo(() => getNextBillingSubscription(subscriptions), [subscriptions])
  const topCategory = useMemo(() => getMostExpensiveCategory(subscriptions), [subscriptions])
  const nextRenewal = useMemo(() => getNextAnnualRenewal(subscriptions), [subscriptions])

  const displayTotal = notAmortizeYearly
    ? summary.totalMonthly * 12 + summary.totalAnnual
    : summary.totalMonthlyEstimate

  const totalLabel = notAmortizeYearly ? 'GASTO ANUAL' : 'GASTO MENSUAL'

  const nextBillingDays = nextBilling ? getDaysUntilBilling(nextBilling.billing_day) : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total */}
      <Card padding="md" className="relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-0.5 rounded-full bg-[var(--module-gastos)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary font-semibold">
            {totalLabel}
          </span>
        </div>
        <p className="font-heading text-2xl text-foreground">
          {formatCurrency(displayTotal)}
        </p>
        <p className="text-xs text-text-tertiary mt-1">
          de {summary.countActive} suscripciones activas
        </p>
        <Wallet
          size={48}
          strokeWidth={0.75}
          className="absolute -right-1 -bottom-1 text-foreground/[0.04]"
        />
      </Card>

      {/* Card 2: Next billing */}
      <Card padding="md" className={`relative overflow-hidden ${nextBillingDays === 0 ? 'border-accent/30 bg-[rgba(196,112,74,0.04)]' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-0.5 rounded-full bg-[var(--module-gastos)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary font-semibold">
            PRÓXIMO COBRO
          </span>
        </div>
        {nextBilling ? (
          <>
            <div className="flex items-center gap-2">
              <ServiceAvatar
                name={nextBilling.name}
                icon={nextBilling.icon}
                color={nextBilling.color}
                size="sm"
              />
              <span className="font-heading text-lg text-foreground truncate">
                {nextBilling.name}
              </span>
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              {formatCurrency(nextBilling.amount)} —{' '}
              {nextBillingDays === 0 ? (
                <span className="text-accent font-semibold">hoy</span>
              ) : nextBillingDays === 1 ? (
                <span className="text-amber-600 font-medium">mañana</span>
              ) : (
                `en ${nextBillingDays} días`
              )}
            </p>
          </>
        ) : (
          <p className="text-sm text-text-tertiary">Sin suscripciones activas</p>
        )}
        <CalendarClock
          size={48}
          strokeWidth={0.75}
          className="absolute -right-1 -bottom-1 text-foreground/[0.04]"
        />
      </Card>

      {/* Card 3: Top category */}
      <Card padding="md" className="relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-0.5 rounded-full bg-[var(--module-gastos)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary font-semibold">
            MAYOR GASTO
          </span>
        </div>
        {topCategory ? (
          <>
            <p className="font-heading text-lg text-foreground truncate">
              {topCategory.category?.name ?? 'Sin categoría'}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              {formatCurrency(topCategory.total)}/mes — {topCategory.count} servicio{topCategory.count !== 1 ? 's' : ''}
            </p>
          </>
        ) : (
          <p className="text-sm text-text-tertiary">Sin datos</p>
        )}
        <FolderOpen
          size={48}
          strokeWidth={0.75}
          className="absolute -right-1 -bottom-1 text-foreground/[0.04]"
        />
      </Card>

      {/* Card 4: Next renewal */}
      <Card padding="md" className="relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-0.5 rounded-full bg-[var(--module-gastos)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-tertiary font-semibold">
            RENOVACIÓN PRÓXIMA
          </span>
        </div>
        {nextRenewal ? (
          <>
            <div className="flex items-center gap-2">
              <ServiceAvatar
                name={nextRenewal.subscription.name}
                icon={nextRenewal.subscription.icon}
                color={nextRenewal.subscription.color}
                size="sm"
              />
              <span className="font-heading text-lg text-foreground truncate">
                {nextRenewal.subscription.name}
              </span>
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              {formatCurrency(nextRenewal.subscription.amount)} en {nextRenewal.daysUntil} días
            </p>
          </>
        ) : (
          <p className="text-sm text-text-tertiary">Sin suscripciones anuales</p>
        )}
        <RotateCcw
          size={48}
          strokeWidth={0.75}
          className="absolute -right-1 -bottom-1 text-foreground/[0.04]"
        />
      </Card>
    </div>
  )
}
