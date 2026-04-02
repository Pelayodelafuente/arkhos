"use client"

import { useMemo } from "react"
import { CalendarDays } from "lucide-react"
import { motion, useSpring, useTransform, useMotionValue, useReducedMotion } from "framer-motion"
import { useEffect } from "react"
import { Card } from "@/components/ui"
import { useExpensesStore, useExpenseSummary } from "@/stores/expenses-store"
import { formatCurrency } from "@/lib/gastos-utils"

function AnimatedCurrency({ value }: { value: number }) {
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { stiffness: 80, damping: 25 })
  const display = useTransform(spring, (v) => formatCurrency(v))
  const shouldReduce = useReducedMotion()

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  if (shouldReduce) return <span>{formatCurrency(value)}</span>
  return <motion.span>{display}</motion.span>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function BudgetRing({ userId }: { userId: string }) {
  const subscriptions = useExpensesStore((s) => s.subscriptions)
  const summary = useExpenseSummary()

  const { annualTotal, monthlyContrib, annualContrib, quarterlyContrib, semiannualContrib } = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'active' || s.status === 'trial')
    const monthly = active.filter((s) => s.cycle === 'monthly').reduce((acc, s) => acc + s.amount, 0)
    const quarterly = active.filter((s) => s.cycle === 'quarterly').reduce((acc, s) => acc + s.amount, 0)
    const semiannual = active.filter((s) => s.cycle === 'semiannual').reduce((acc, s) => acc + s.amount, 0)
    const annual = active.filter((s) => s.cycle === 'annual').reduce((acc, s) => acc + s.amount, 0)
    return {
      annualTotal: monthly * 12 + quarterly * 4 + semiannual * 2 + annual,
      monthlyContrib: monthly * 12,
      annualContrib: annual,
      quarterlyContrib: quarterly * 4,
      semiannualContrib: semiannual * 2,
    }
  }, [subscriptions])

  const countMonthly = subscriptions.filter((s) => (s.status === 'active' || s.status === 'trial') && s.cycle === 'monthly').length
  const countAnnual = subscriptions.filter((s) => (s.status === 'active' || s.status === 'trial') && s.cycle === 'annual').length
  const countOther = subscriptions.filter((s) => (s.status === 'active' || s.status === 'trial') && (s.cycle === 'quarterly' || s.cycle === 'semiannual')).length

  if (summary.countActive === 0) {
    return (
      <Card padding="md">
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CalendarDays size={24} strokeWidth={1} className="text-text-tertiary/40" />
          <p className="text-xs text-text-tertiary">Sin suscripciones activas</p>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="md">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-0.5 rounded-full bg-[var(--module-gastos)]" />
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-text-tertiary font-semibold">
            Gasto anual real
          </span>
        </div>

        {/* Big number */}
        <div className="text-center py-1">
          <p className="font-heading text-3xl font-bold text-foreground">
            <AnimatedCurrency value={annualTotal} />
          </p>
          <p className="text-[10px] text-text-tertiary mt-0.5 font-mono">
            {summary.countActive} suscripciones activas
          </p>
        </div>

        {/* Breakdown */}
        <div className="space-y-1.5 border-t border-border pt-2.5">
          {countMonthly > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[rgba(74,122,155,0.8)]" />
                <span className="text-[11px] text-text-tertiary">
                  {countMonthly} mensual{countMonthly !== 1 ? 'es' : ''} × 12
                </span>
              </div>
              <span className="font-mono text-[11px] text-foreground tabular-nums">
                {formatCurrency(monthlyContrib)}
              </span>
            </div>
          )}
          {countAnnual > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--module-gastos)]" />
                <span className="text-[11px] text-text-tertiary">
                  {countAnnual} anual{countAnnual !== 1 ? 'es' : ''}
                </span>
              </div>
              <span className="font-mono text-[11px] text-foreground tabular-nums">
                {formatCurrency(annualContrib)}
              </span>
            </div>
          )}
          {countOther > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--module-proyectos)]/60" />
                <span className="text-[11px] text-text-tertiary">
                  {countOther} trim./semest.
                </span>
              </div>
              <span className="font-mono text-[11px] text-foreground tabular-nums">
                {formatCurrency(quarterlyContrib + semiannualContrib)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
