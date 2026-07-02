"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ChevronDown, CreditCard, Pencil, PauseCircle, Play, Plus, X, MonitorPlay, Code2, Music, HardDrive, Zap, Gamepad2, Shield, Heart, BookOpen, TrendingUp, Layers, StickyNote } from "lucide-react"
import { ICON_MAP } from "./CategoryManager"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Card, Badge, Button } from "@/components/ui"
import { useExpensesStore, useFilteredSubscriptions, useCycleFilteredSubscriptions } from "@/stores/expenses-store"
import { useNotesStore } from "@/stores/notes-store"
import { ServiceAvatar } from "./ServiceAvatar"
import { HighlightText } from "./HighlightText"
import { formatCurrency, formatNextBilling, isBillingToday, groupByCategory, getCycleShortLabel, getDaysUntilBilling, getNextBillingDate } from "@/lib/gastos-utils"
import type { BillingCycle, SubscriptionWithCategory } from "@/types/expenses"

function getCycleSuffix(cycle: BillingCycle): string {
  switch (cycle) {
    case 'monthly': return '/mes'
    case 'quarterly': return '/trim'
    case 'semiannual': return '/sem'
    case 'annual': return '/año'
  }
}

interface SubscriptionListProps {
  onEdit: (subscription: SubscriptionWithCategory) => void
  onNew: () => void
}

export function SubscriptionList({ onEdit, onNew }: SubscriptionListProps) {
  const filtered = useFilteredSubscriptions()
  const searchQuery = useExpensesStore((s) => s.searchQuery)
  const listViewMode = useExpensesStore((s) => s.listViewMode)
  const setListViewMode = useExpensesStore((s) => s.setListViewMode)
  const collapsedCategories = useExpensesStore((s) => s.collapsedCategories)
  const toggleCategoryCollapse = useExpensesStore((s) => s.toggleCategoryCollapse)
  const toggleActive = useExpensesStore((s) => s.toggleActive)
  const notAmortizeYearly = useExpensesStore((s) => s.notAmortizeYearly)
  const categoryFilter = useExpensesStore((s) => s.categoryFilter)
  const setCategoryFilter = useExpensesStore((s) => s.setCategoryFilter)
  const allSubs = useCycleFilteredSubscriptions()
  const allNotes = useNotesStore((s) => s.notes)

  // Build a map of subscription_id → note count
  const noteCountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const note of allNotes) {
      if (note.subscription_id) {
        map.set(note.subscription_id, (map.get(note.subscription_id) ?? 0) + 1)
      }
    }
    return map
  }, [allNotes])
  const activeCategoryName = categoryFilter
    ? allSubs.find((s) => s.category_id === categoryFilter)?.category?.name ?? 'Categoría'
    : null

  if (filtered.length === 0) {
    return <EmptyState onNew={onNew} searchQuery={searchQuery} />
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-0.5 rounded-full bg-accent" />
          <span className="font-mono text-[10px] tracking-[0.08em] text-text-tertiary">
            {activeCategoryName ? 'FILTRADO POR' : 'TODAS LAS SUSCRIPCIONES'}
          </span>
          {activeCategoryName && (
            <button
              onClick={() => setCategoryFilter(null)}
              className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent hover:bg-accent/20 transition-colors cursor-pointer"
            >
              {activeCategoryName}
              <X size={10} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-sand p-0.5">
          <button
            onClick={() => setListViewMode('category')}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium transition-all active:scale-[0.97] ${
              listViewMode === 'category'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            Categoría
          </button>
          <button
            onClick={() => setListViewMode('chronological')}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium transition-all active:scale-[0.97] ${
              listViewMode === 'chronological'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            Cronológico
          </button>
        </div>
      </div>

      <Card padding="sm">
        <AnimatePresence mode="wait">
          {listViewMode === 'category' ? (
            <motion.div
              key="category"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <CategoryView
                subscriptions={filtered}
                searchQuery={searchQuery}
                collapsedCategories={collapsedCategories}
                toggleCategoryCollapse={toggleCategoryCollapse}
                onEdit={onEdit}
                toggleActive={toggleActive}
                notAmortizeYearly={notAmortizeYearly}
                noteCountMap={noteCountMap}
              />
            </motion.div>
          ) : (
            <motion.div
              key="chronological"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChronologicalView
                subscriptions={filtered}
                searchQuery={searchQuery}
                onEdit={onEdit}
                toggleActive={toggleActive}
                notAmortizeYearly={notAmortizeYearly}
                noteCountMap={noteCountMap}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}

// ─── Category icon mapping ───────────

function getCategoryIcon(iconName: string, fallbackName: string) {
  // Use stored Lucide icon name first
  const Icon = ICON_MAP[iconName]
  if (Icon) return <Icon size={13} strokeWidth={1.5} />
  // Fallback: keyword matching on category name (legacy categories)
  const lower = fallbackName.toLowerCase()
  if (lower.includes('stream') || lower.includes('video') || lower.includes('tv')) return <MonitorPlay size={13} strokeWidth={1.5} />
  if (lower.includes('softw') || lower.includes('cod') || lower.includes('dev') || lower.includes('programac')) return <Code2 size={13} strokeWidth={1.5} />
  if (lower.includes('mús') || lower.includes('music') || lower.includes('audio') || lower.includes('podcast')) return <Music size={13} strokeWidth={1.5} />
  if (lower.includes('almac') || lower.includes('storage') || lower.includes('cloud') || lower.includes('drive')) return <HardDrive size={13} strokeWidth={1.5} />
  if (lower.includes('product') || lower.includes('trabajo') || lower.includes('work') || lower.includes('ofic')) return <Zap size={13} strokeWidth={1.5} />
  if (lower.includes('gaming') || lower.includes('juego') || lower.includes('game')) return <Gamepad2 size={13} strokeWidth={1.5} />
  if (lower.includes('segur') || lower.includes('secur') || lower.includes('vpn') || lower.includes('contraseñ')) return <Shield size={13} strokeWidth={1.5} />
  if (lower.includes('salud') || lower.includes('health') || lower.includes('fitness') || lower.includes('deport')) return <Heart size={13} strokeWidth={1.5} />
  if (lower.includes('educ') || lower.includes('curso') || lower.includes('learn') || lower.includes('libro')) return <BookOpen size={13} strokeWidth={1.5} />
  if (lower.includes('financ') || lower.includes('dinero') || lower.includes('banco') || lower.includes('invers')) return <TrendingUp size={13} strokeWidth={1.5} />
  return <Layers size={13} strokeWidth={1.5} />
}

// ─── Category View ──────────────────

interface ViewProps {
  subscriptions: SubscriptionWithCategory[]
  searchQuery: string
  onEdit: (sub: SubscriptionWithCategory) => void
  toggleActive: (id: string) => Promise<void>
  notAmortizeYearly: boolean
  noteCountMap: Map<string, number>
}

interface CategoryViewProps extends ViewProps {
  collapsedCategories: Set<string>
  toggleCategoryCollapse: (id: string) => void
}

function CategoryView({
  subscriptions,
  searchQuery,
  collapsedCategories,
  toggleCategoryCollapse,
  onEdit,
  toggleActive,
  notAmortizeYearly,
  noteCountMap,
}: CategoryViewProps) {
  const groups = useMemo(() => groupByCategory(subscriptions), [subscriptions])

  return (
    <div className="divide-y divide-border">
      {groups.map((group) => {
        const key = group.category?.id ?? '__uncategorized__'
        const isCollapsed = collapsedCategories.has(key)
        // Exclude paused subscriptions from the category total
        const activeSubs = group.subscriptions.filter((s) => s.status !== 'paused')
        const activeMonthly = activeSubs.filter((s) => s.cycle === 'monthly').reduce((acc, s) => acc + s.amount, 0)
        const activeQuarterly = activeSubs.filter((s) => s.cycle === 'quarterly').reduce((acc, s) => acc + s.amount, 0)
        const activeSemiannual = activeSubs.filter((s) => s.cycle === 'semiannual').reduce((acc, s) => acc + s.amount, 0)
        const activeAnnual = activeSubs.filter((s) => s.cycle === 'annual').reduce((acc, s) => acc + s.amount, 0)
        const groupTotal = notAmortizeYearly
          ? activeMonthly + activeQuarterly + activeSemiannual + activeAnnual
          : activeMonthly + activeQuarterly / 3 + activeSemiannual / 6 + activeAnnual / 12

        // El presupuesto es mensual: se compara siempre contra el gasto amortizado
        const amortizedTotal =
          activeMonthly + activeQuarterly / 3 + activeSemiannual / 6 + activeAnnual / 12
        const budget = group.category?.budget ?? null
        const budgetPct = budget && budget > 0 ? (amortizedTotal / budget) * 100 : null

        return (
          <div key={key}>
            {/* Category header */}
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => toggleCategoryCollapse(key)}
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? "Expandir categoría" : "Contraer categoría"}
              className="flex w-full items-center gap-3 px-3 py-2 hover:bg-sand/30 rounded-lg transition-colors select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
            style={group.category?.color ? { backgroundColor: group.category.color + '14' } : undefined}
            >
              <ChevronDown
                size={14}
                strokeWidth={1.75}
                className={`text-text-tertiary transition-transform duration-200 flex-shrink-0 ${
                  isCollapsed ? '-rotate-90' : ''
                }`}
              />
              {group.category && (
                <span className="text-foreground/50 flex-shrink-0 flex items-center">
                  {getCategoryIcon(group.category.icon, group.category.name)}
                </span>
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                {group.category?.name ?? 'Sin categoría'}
              </span>
              <span className="flex-1 border-b border-dashed border-border/50" />
              <span className="text-xs text-text-tertiary flex-shrink-0">
                {group.subscriptions.length} servicio{group.subscriptions.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs font-mono font-semibold text-foreground flex-shrink-0">
                {formatCurrency(groupTotal)}
              </span>
            </motion.button>

            {/* Presupuesto por categoría: barra de progreso con umbrales 80/100% */}
            {budgetPct !== null && budget !== null && (
              <div className="flex items-center gap-2 px-3 pb-2 pt-0.5">
                <div
                  className="h-1 flex-1 overflow-hidden rounded-full bg-sand"
                  role="progressbar"
                  aria-valuenow={Math.round(budgetPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Presupuesto de ${group.category?.name ?? 'categoría'}`}
                >
                  <div
                    className={`h-full rounded-full transition-all ${
                      budgetPct >= 100
                        ? 'bg-red-500'
                        : budgetPct >= 80
                          ? 'bg-amber-500'
                          : 'bg-[var(--module-gastos)]'
                    }`}
                    style={{ width: `${Math.min(budgetPct, 100)}%` }}
                  />
                </div>
                <span
                  className={`flex-shrink-0 font-mono text-[10px] ${
                    budgetPct >= 100
                      ? 'text-red-600'
                      : budgetPct >= 80
                        ? 'text-amber-600'
                        : 'text-text-tertiary'
                  }`}
                >
                  {Math.round(budgetPct)}% de {formatCurrency(budget)}
                </span>
              </div>
            )}

            {/* Items */}
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  {group.subscriptions.map((sub, idx) => (
                    <SubscriptionRow
                      key={sub.id}
                      index={idx}
                      subscription={sub}
                      searchQuery={searchQuery}
                      onEdit={() => onEdit(sub)}
                      onToggleActive={() => toggleActive(sub.id)}
                      notAmortizeYearly={notAmortizeYearly}
                      noteCount={noteCountMap.get(sub.id) ?? 0}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

// ─── Chronological View ─────────────

function ChronologicalView({
  subscriptions,
  searchQuery,
  onEdit,
  toggleActive,
  notAmortizeYearly,
  noteCountMap,
}: ViewProps) {
  // Sort by next billing date (closest first) — uses full date to correctly handle annual/quarterly
  const sorted = useMemo(() => {
    return [...subscriptions]
      .filter((s) => s.status === 'active')
      .sort((a, b) => getNextBillingDate(a).getTime() - getNextBillingDate(b).getTime())
  }, [subscriptions])

  return (
    <div className="divide-y divide-border">
      {sorted.map((sub, idx) => (
        <SubscriptionRow
          key={sub.id}
          index={idx}
          subscription={sub}
          searchQuery={searchQuery}
          onEdit={() => onEdit(sub)}
          onToggleActive={() => toggleActive(sub.id)}
          notAmortizeYearly={notAmortizeYearly}
          noteCount={noteCountMap.get(sub.id) ?? 0}
        />
      ))}
    </div>
  )
}

// ─── Subscription Row ───────────────

function SubscriptionRow({
  index = 0,
  subscription,
  searchQuery,
  onEdit,
  onToggleActive,
  notAmortizeYearly,
  noteCount = 0,
}: {
  index?: number
  subscription: SubscriptionWithCategory
  searchQuery: string
  onEdit: () => void
  onToggleActive: () => void
  notAmortizeYearly: boolean
  noteCount?: number
}) {
  const prefersReducedMotion = useReducedMotion()
  const isPaused = subscription.status === 'paused'
  const isCancelled = subscription.status === 'cancelled'
  const isTrial = subscription.status === 'trial'
  const isInactive = isPaused || isCancelled
  const billingToday = isBillingToday(subscription)

  // When notAmortizeYearly: show annualized amount; otherwise show raw amount
  const displayAmount = notAmortizeYearly
    ? subscription.cycle === 'monthly' ? subscription.amount * 12
      : subscription.cycle === 'quarterly' ? subscription.amount * 4
      : subscription.cycle === 'semiannual' ? subscription.amount * 2
      : subscription.amount
    : subscription.amount

  // Countdown days
  const daysUntil = !isInactive ? getDaysUntilBilling(subscription) : null

  // Billing cycle progress: how far into the current billing period
  const cycleProgress = useMemo(() => {
    if (isInactive) return 0
    const cycleDaysMap: Record<string, number> = {
      monthly: 30,
      quarterly: 90,
      semiannual: 180,
      annual: 365,
    }
    const totalDays = cycleDaysMap[subscription.cycle] ?? 30
    const nextDate = getNextBillingDate(subscription)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    nextDate.setHours(0, 0, 0, 0)
    const daysLeft = Math.round((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const daysSinceLast = totalDays - daysLeft
    return Math.max(0, Math.min(100, (daysSinceLast / totalDays) * 100))
  }, [subscription, isInactive])

  const categoryColor = subscription.category?.color ?? undefined

  return (
    <motion.div
      {...(prefersReducedMotion ? {} : {
        initial: { opacity: 0, y: 8 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-20px" },
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 },
      })}
      className={`group relative flex items-center gap-3 px-3 py-3 transition-all hover:bg-[rgba(240,235,225,0.5)] hover:-translate-y-[1px] cursor-pointer ${
        isInactive ? 'opacity-35' : ''
      }`}
      onClick={onEdit}
    >
      {/* Billing day */}
      <span className="font-mono text-[11px] text-text-tertiary min-w-[24px] text-right flex-shrink-0">
        {subscription.billing_day}
      </span>

      {/* Service avatar */}
      <ServiceAvatar
        name={subscription.name}
        icon={subscription.icon}
        color={subscription.color}
        size="sm"
        iconUrl={subscription.icon_url}
        url={subscription.url}
      />

      {/* Name + next billing + tags + cycle progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[13px] font-semibold text-foreground truncate ${isInactive ? 'line-through' : ''}`}>
            <HighlightText text={subscription.name} query={searchQuery} />
          </span>
          {isPaused && (
            <span className="rounded-full bg-sand px-2 py-0.5 text-[10px] font-medium text-foreground/40 flex-shrink-0">
              Pausada
            </span>
          )}
          {isCancelled && (
            <span className="rounded-full bg-sand px-2 py-0.5 text-[10px] font-medium text-foreground/40 flex-shrink-0">
              Cancelada
            </span>
          )}
          {isTrial && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 flex-shrink-0">
              Prueba
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {!isInactive && (
            <span className="text-xs text-text-tertiary">
              {billingToday ? (
                <span className="text-accent font-medium">Cobro hoy</span>
              ) : (
                `Próximo cobro: ${formatNextBilling(subscription)}`
              )}
            </span>
          )}
          {/* Countdown badge — urgency system */}
          {daysUntil !== null && daysUntil > 0 && daysUntil <= 14 && !billingToday && (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium font-mono border"
              style={{
                backgroundColor: daysUntil <= 2
                  ? 'var(--urgency-critical-bg)'
                  : daysUntil <= 5
                    ? 'var(--urgency-warning-bg)'
                    : 'var(--urgency-soon-bg)',
                color: daysUntil <= 2
                  ? 'var(--urgency-critical)'
                  : daysUntil <= 5
                    ? 'var(--urgency-warning)'
                    : 'var(--urgency-soon)',
                borderColor: daysUntil <= 2
                  ? 'rgba(192,57,43,0.22)'
                  : daysUntil <= 5
                    ? 'rgba(212,121,14,0.22)'
                    : 'rgba(154,106,40,0.22)',
              }}
            >
              En {daysUntil} día{daysUntil !== 1 ? 's' : ''}
            </span>
          )}
          {subscription.tags && subscription.tags.length > 0 && (
            <span className="flex items-center gap-1">
              {subscription.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-sand px-1.5 py-px text-[10px] text-text-tertiary"
                >
                  {tag}
                </span>
              ))}
              {subscription.tags.length > 3 && (
                <span className="text-[10px] text-text-tertiary">+{subscription.tags.length - 3}</span>
              )}
            </span>
          )}
        </div>
        {/* Cycle progress bar with tooltip */}
        {!isInactive && (
          <div className="group/bar relative mt-1">
            <div className="h-[3px] w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${cycleProgress}%`,
                  background: categoryColor
                    ? `linear-gradient(90deg, ${categoryColor}B3, ${categoryColor})`
                    : 'linear-gradient(90deg, rgba(95,27,41,0.7), var(--module-gastos))',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>
            {/* Progress tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] opacity-0 group-hover/bar:opacity-100 transition-opacity duration-100 z-10" style={{ boxShadow: 'var(--shadow-modal)' }}>
              <span className="text-text-secondary font-medium">{Math.round(cycleProgress)}% del ciclo</span>
              {daysUntil !== null && (
                <span className="text-text-tertiary"> · {daysUntil === 0 ? 'hoy' : `${daysUntil}d restantes`}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cycle badge */}
      <Badge variant={subscription.cycle === "monthly" ? "blue" : subscription.cycle === "annual" ? "gold" : subscription.cycle === "quarterly" ? "terracotta" : "green"}>
        {getCycleShortLabel(subscription.cycle)}
      </Badge>

      {/* Amount + currency */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {subscription.currency && subscription.currency !== 'EUR' && (
          <span className="rounded bg-sand px-1 py-px text-[9px] font-mono font-medium text-text-tertiary">
            {subscription.currency}
          </span>
        )}
        <span className={`font-mono text-[13px] text-foreground min-w-[72px] text-right ${isInactive ? 'line-through' : ''}`}>
          {formatCurrency(displayAmount)}
          <span className="text-[10px] text-text-tertiary ml-0.5">{getCycleSuffix(subscription.cycle)}</span>
        </span>
      </div>

      {/* Billing today dot */}
      {billingToday && !isInactive && (
        <span title="Se cobra hoy" className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
      )}

      {/* Notas badge — visible when subscription has linked notes */}
      {noteCount > 0 && (
        <Link
          href={`/notas?subscription=${subscription.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 rounded-full border border-border bg-sand px-2 py-0.5 text-[10px] font-medium text-text-secondary hover:bg-sand/80 hover:text-foreground transition-colors flex-shrink-0"
          title="Ver notas vinculadas"
        >
          <StickyNote size={10} strokeWidth={1.75} />
          {noteCount}
        </Link>
      )}

      {/* Hover actions */}
      <div className="flex items-center gap-1 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          aria-label="Editar suscripción"
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-sand hover:text-foreground hover:scale-110 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
        >
          <Pencil size={13} strokeWidth={1.75} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleActive() }}
          aria-label={isPaused ? "Activar suscripción" : "Pausar suscripción"}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-sand hover:text-foreground hover:scale-110 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
        >
          {isPaused ? <Play size={13} strokeWidth={1.75} /> : <PauseCircle size={13} strokeWidth={1.75} />}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Empty State ────────────────────

function EmptyState({ onNew, searchQuery }: { onNew: () => void; searchQuery: string }) {
  const cycleFilter = useExpensesStore((s) => s.cycleFilter)
  const allSubscriptions = useExpensesStore((s) => s.subscriptions)

  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-text-tertiary mb-2">
          No se encontraron suscripciones para &quot;{searchQuery}&quot;
        </p>
        <Button variant="ghost" size="sm" onClick={() => useExpensesStore.getState().setSearchQuery('')}>
          Limpiar búsqueda
        </Button>
      </div>
    )
  }

  // Contextual message when cycle filter is active
  if (cycleFilter !== 'all') {
    const cycleLabels: Record<string, string> = {
      monthly: 'mensuales',
      quarterly: 'trimestrales',
      semiannual: 'semestrales',
      annual: 'anuales',
    }
    const otherCount = allSubscriptions.filter((s) => s.cycle !== cycleFilter).length
    const filterLabel = cycleLabels[cycleFilter] ?? cycleFilter
    const otherLabel = 'de otros ciclos'

    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CreditCard size={48} strokeWidth={0.75} className="text-text-tertiary/30 mb-3" />
        <p className="text-sm text-text-secondary mb-1">
          No tienes suscripciones {filterLabel}
        </p>
        {otherCount > 0 && (
          <p className="text-xs text-text-tertiary mb-4">
            Tienes {otherCount} suscripción{otherCount !== 1 ? 'es' : ''} {otherLabel}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => useExpensesStore.getState().setCycleFilter('all')}
        >
          Mostrar todas
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CreditCard size={64} strokeWidth={0.75} className="text-text-tertiary/30 mb-4" />
      <h3 className="font-heading text-xl text-foreground mb-2">
        Aún no tienes suscripciones
      </h3>
      <p className="text-sm text-text-tertiary mb-6 max-w-sm">
        Añade tu primera suscripción para empezar a controlar tus gastos recurrentes
      </p>
      <Button variant="primary" onClick={onNew}>
        <Plus size={16} strokeWidth={1.75} />
        Añadir primera suscripción
      </Button>
    </div>
  )
}
