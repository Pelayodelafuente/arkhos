"use client"

import { useMemo, useEffect } from "react"
import { Wallet, CalendarClock, FolderOpen, RotateCcw } from "lucide-react"
import { motion, useSpring, useTransform, useMotionValue, useReducedMotion } from "framer-motion"
import { useExpensesStore, useExpenseSummary, useCycleFilteredSubscriptions } from "@/stores/expenses-store"
import { formatCurrency, getNextBillingSubscription, getMostExpensiveCategory, getNextAnnualRenewals, getDaysUntilBilling } from "@/lib/gastos-utils"
import { ServiceAvatar } from "./ServiceAvatar"

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function AnimatedNumber({ value, format }: { value: number; format?: (n: number) => string }) {
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { stiffness: 100, damping: 30 })
  const display = useTransform(spring, (v) => format ? format(v) : v.toFixed(2))

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  return <motion.span>{display}</motion.span>
}

const glassStyle = {
  background: 'rgba(255,255,255,0.6)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(160,120,80,0.20)',
  boxShadow: 'var(--shadow-card)',
} as const

export function KPICards() {
  const subscriptions = useCycleFilteredSubscriptions()
  const notAmortizeYearly = useExpensesStore((s) => s.notAmortizeYearly)
  const cycleFilter = useExpensesStore((s) => s.cycleFilter)
  const viewedYear = useExpensesStore((s) => s.viewedYear)
  const viewedMonth = useExpensesStore((s) => s.viewedMonth)
  const summary = useExpenseSummary()
  const shouldReduce = useReducedMotion()

  const isAnnualView = cycleFilter === 'annual'
  const now = new Date()
  const isCurrentMonth = viewedYear === now.getFullYear() && viewedMonth === now.getMonth() + 1

  const nextBilling = useMemo(() => {
    // Annual view: find nearest upcoming annual billing (may be in a future month)
    if (isCurrentMonth || isAnnualView) {
      return getNextBillingSubscription(subscriptions)
    }
    // For non-current month (monthly/all view): only include subs billing in that month
    const active = subscriptions.filter((s) => {
      if (s.status !== 'active') return false
      if (s.cycle === 'monthly') return true
      if (s.cycle === 'annual' && s.started_at) {
        return new Date(s.started_at).getMonth() + 1 === viewedMonth
      }
      return false
    })
    if (active.length === 0) return null
    const daysInMonth = new Date(viewedYear, viewedMonth, 0).getDate()
    const sorted = [...active]
      .map((s) => ({ sub: s, effectiveDay: Math.min(s.billing_day, daysInMonth) }))
      .sort((a, b) => a.effectiveDay - b.effectiveDay)
    return sorted[0]?.sub ?? null
  }, [subscriptions, isCurrentMonth, isAnnualView, viewedYear, viewedMonth])

  const topCategory = useMemo(() => getMostExpensiveCategory(subscriptions), [subscriptions])
  const nextRenewals = useMemo(() => getNextAnnualRenewals(subscriptions, 1), [subscriptions])

  // Annual view: sum all active annual sub amounts (not restricted to billing month)
  const annualViewTotal = useMemo(() => {
    if (!isAnnualView) return 0
    return subscriptions.filter((s) => s.is_active).reduce((sum, s) => sum + s.amount, 0)
  }, [subscriptions, isAnnualView])

  // Top category total for annual view
  const topCategoryAnnualTotal = useMemo(() => {
    if (!topCategory || !isAnnualView) return 0
    return subscriptions
      .filter((s) => s.is_active && (topCategory.category ? s.category_id === topCategory.category.id : !s.category_id))
      .reduce((sum, s) => sum + s.amount, 0)
  }, [topCategory, subscriptions, isAnnualView])

  const displayTotal = isAnnualView
    ? annualViewTotal
    : notAmortizeYearly
      ? summary.totalMonthly * 12 + summary.totalQuarterly * 4 + summary.totalSemiannual * 2 + summary.totalAnnual
      : summary.totalMonthly + summary.totalQuarterly / 3 + summary.totalSemiannual / 6 + summary.totalAnnual / 12

  const totalLabel = (isAnnualView || notAmortizeYearly) ? 'GASTO ANUAL' : 'GASTO MENSUAL'

  const nextBillingDays = nextBilling && isCurrentMonth ? getDaysUntilBilling(nextBilling) : null

  const cardMotionProps = (index: number) =>
    shouldReduce
      ? {}
      : {
          initial: { opacity: 0, y: 12, scale: 0.96 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const, delay: index * 0.08 },
          whileHover: { y: -2, boxShadow: '0 8px 32px rgba(26,23,20,0.10)' },
        }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total */}
      <motion.div
        {...cardMotionProps(0)}
        className="relative overflow-hidden rounded-2xl p-4 transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
        style={{
          ...glassStyle,
          borderLeft: '4px solid var(--module-gastos)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
            {totalLabel}
          </span>
        </div>
        <p className="font-heading text-2xl font-bold text-foreground">
          <AnimatedNumber value={displayTotal} format={formatCurrency} />
        </p>
        <p className="text-xs text-text-tertiary mt-1">
          de {summary.countActive} suscripciones activas
        </p>
        <Wallet
          size={48}
          strokeWidth={0.75}
          className="absolute -right-1 -bottom-1 text-foreground/[0.04]"
        />
      </motion.div>

      {/* Card 2: Next billing */}
      <motion.div
        {...cardMotionProps(1)}
        className="relative overflow-hidden rounded-2xl p-4 transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
        style={{
          ...glassStyle,
          borderLeft: nextBillingDays === 0
            ? '4px solid var(--urgency-critical)'
            : nextBillingDays !== null && nextBillingDays <= 3
              ? '4px solid var(--urgency-warning)'
              : '4px solid var(--module-gastos)',
          ...(nextBillingDays === 0 ? { background: 'var(--urgency-critical-bg)' } : {}),
          ...(nextBillingDays !== null && nextBillingDays > 0 && nextBillingDays <= 3 ? { background: 'var(--urgency-warning-bg)' } : {}),
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
            {isCurrentMonth ? 'PRÓXIMO COBRO' : `PRIMER COBRO · ${MONTH_NAMES[viewedMonth - 1]?.toUpperCase()}`}
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
                iconUrl={nextBilling.icon_url}
                url={nextBilling.url}
              />
              <span className="font-heading text-lg text-foreground truncate">
                {nextBilling.name}
              </span>
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              <AnimatedNumber value={nextBilling.amount} format={formatCurrency} /> —{' '}
              {isCurrentMonth ? (
                nextBillingDays === 0 ? (
                  <span className="text-accent font-semibold">hoy</span>
                ) : nextBillingDays === 1 ? (
                  <span className="text-amber-600 font-medium">mañana</span>
                ) : (
                  `en ${nextBillingDays} días`
                )
              ) : (
                `día ${nextBilling.billing_day} de ${MONTH_NAMES[viewedMonth - 1]}`
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
      </motion.div>

      {/* Card 3: Top category */}
      <motion.div
        {...cardMotionProps(2)}
        className="relative overflow-hidden rounded-2xl p-4 transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
        style={{
          ...glassStyle,
          borderLeft: '4px solid var(--module-patrimonio)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
            MAYOR GASTO
          </span>
        </div>
        {topCategory ? (
          <>
            <p className="font-heading text-lg text-foreground truncate">
              {topCategory.category?.name ?? 'Sin categoría'}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              <AnimatedNumber value={isAnnualView ? topCategoryAnnualTotal : topCategory.total} format={formatCurrency} />{isAnnualView ? '/año' : '/mes'} — {topCategory.count} servicio{topCategory.count !== 1 ? 's' : ''}
              {displayTotal > 0 && (
                <span className="ml-1 font-mono text-[10px] text-accent font-medium">
                  ({Math.round(((isAnnualView ? topCategoryAnnualTotal : topCategory.total) / displayTotal) * 100)}%)
                </span>
              )}
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
      </motion.div>

      {/* Card 4: Next renewal */}
      <motion.div
        {...cardMotionProps(3)}
        className="relative overflow-hidden rounded-2xl p-4 transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
        style={{
          ...glassStyle,
          borderLeft: '4px solid var(--module-mercados)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
            PRÓXIMAS ANUALES
          </span>
        </div>
        {nextRenewals.length > 0 ? (() => {
          const { subscription: sub, daysUntil } = nextRenewals[0]!
          return (
            <>
              <div className="flex items-center gap-2">
                <ServiceAvatar
                  name={sub.name}
                  icon={sub.icon}
                  color={sub.color}
                  size="sm"
                  iconUrl={sub.icon_url}
                  url={sub.url}
                />
                <span className="font-heading text-lg text-foreground truncate">
                  {sub.name}
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-1">
                <AnimatedNumber value={sub.amount} format={formatCurrency} /> —{' '}
                {daysUntil === 0 ? (
                  <span className="text-accent font-semibold">hoy</span>
                ) : daysUntil === 1 ? (
                  <span className="text-amber-600 font-medium">mañana</span>
                ) : (
                  `en ${daysUntil} días`
                )}
              </p>
            </>
          )
        })() : (
          <p className="text-sm text-text-tertiary">Sin renovaciones anuales</p>
        )}
        <RotateCcw
          size={48}
          strokeWidth={0.75}
          className="absolute -right-1 -bottom-1 text-foreground/[0.04]"
        />
      </motion.div>
    </div>
  )
}
