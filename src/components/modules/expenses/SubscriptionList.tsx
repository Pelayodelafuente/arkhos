"use client"

import { useState, useMemo } from "react"
import { ChevronDown, CreditCard, MoreHorizontal, Pencil, Pause, Play, Plus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, Badge, Button } from "@/components/ui"
import { useExpensesStore, useFilteredSubscriptions } from "@/stores/expenses-store"
import { ServiceAvatar } from "./ServiceAvatar"
import { HighlightText } from "./HighlightText"
import { formatCurrency, formatNextBilling, isBillingToday, groupByCategory } from "@/lib/gastos-utils"
import type { SubscriptionWithCategory } from "@/types/expenses"

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

  if (filtered.length === 0) {
    return <EmptyState onNew={onNew} searchQuery={searchQuery} />
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-0.5 rounded-full bg-accent" />
          <span className="font-mono text-[10px] tracking-[0.08em] text-accent">
            TODAS LAS SUSCRIPCIONES
          </span>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-sand p-0.5">
          <button
            onClick={() => setListViewMode('category')}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              listViewMode === 'category'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            Categoría
          </button>
          <button
            onClick={() => setListViewMode('chronological')}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
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
        {listViewMode === 'category' ? (
          <CategoryView
            subscriptions={filtered}
            searchQuery={searchQuery}
            collapsedCategories={collapsedCategories}
            toggleCategoryCollapse={toggleCategoryCollapse}
            onEdit={onEdit}
            toggleActive={toggleActive}
            notAmortizeYearly={notAmortizeYearly}
          />
        ) : (
          <ChronologicalView
            subscriptions={filtered}
            searchQuery={searchQuery}
            onEdit={onEdit}
            toggleActive={toggleActive}
            notAmortizeYearly={notAmortizeYearly}
          />
        )}
      </Card>
    </div>
  )
}

// ─── Category View ──────────────────

interface ViewProps {
  subscriptions: SubscriptionWithCategory[]
  searchQuery: string
  onEdit: (sub: SubscriptionWithCategory) => void
  toggleActive: (id: string) => Promise<void>
  notAmortizeYearly: boolean
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
}: CategoryViewProps) {
  const groups = useMemo(() => groupByCategory(subscriptions), [subscriptions])

  return (
    <div className="divide-y divide-border">
      {groups.map((group) => {
        const key = group.category?.id ?? '__uncategorized__'
        const isCollapsed = collapsedCategories.has(key)
        const groupTotal = group.totalMonthly + (notAmortizeYearly ? group.totalAnnual : group.totalAnnual / 12)

        return (
          <div key={key}>
            {/* Category header */}
            <button
              onClick={() => toggleCategoryCollapse(key)}
              className="flex w-full items-center gap-3 px-3 py-2 hover:bg-sand/30 rounded-lg transition-colors select-none"
            >
              <ChevronDown
                size={14}
                strokeWidth={1.75}
                className={`text-text-tertiary transition-transform duration-200 flex-shrink-0 ${
                  isCollapsed ? '-rotate-90' : ''
                }`}
              />
              {group.category && (
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.category.color }}
                />
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
            </button>

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
                  {group.subscriptions.map((sub) => (
                    <SubscriptionRow
                      key={sub.id}
                      subscription={sub}
                      searchQuery={searchQuery}
                      onEdit={() => onEdit(sub)}
                      onToggleActive={() => toggleActive(sub.id)}
                      notAmortizeYearly={notAmortizeYearly}
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
}: ViewProps) {
  // Sort by next billing (closest first)
  const sorted = useMemo(() => {
    return [...subscriptions]
      .filter((s) => s.status === 'active')
      .sort((a, b) => {
        const today = new Date().getDate()
        const aDays = a.billing_day >= today ? a.billing_day - today : 31 - today + a.billing_day
        const bDays = b.billing_day >= today ? b.billing_day - today : 31 - today + b.billing_day
        return aDays - bDays
      })
  }, [subscriptions])

  return (
    <div className="divide-y divide-border">
      {sorted.map((sub) => (
        <SubscriptionRow
          key={sub.id}
          subscription={sub}
          searchQuery={searchQuery}
          onEdit={() => onEdit(sub)}
          onToggleActive={() => toggleActive(sub.id)}
          notAmortizeYearly={notAmortizeYearly}
        />
      ))}
    </div>
  )
}

// ─── Subscription Row ───────────────

function SubscriptionRow({
  subscription,
  searchQuery,
  onEdit,
  onToggleActive,
  notAmortizeYearly,
}: {
  subscription: SubscriptionWithCategory
  searchQuery: string
  onEdit: () => void
  onToggleActive: () => void
  notAmortizeYearly: boolean
}) {
  const isPaused = subscription.status === 'paused'
  const isCancelled = subscription.status === 'cancelled'
  const isTrial = subscription.status === 'trial'
  const isInactive = isPaused || isCancelled
  const billingToday = isBillingToday(subscription.billing_day)

  const displayAmount = notAmortizeYearly && subscription.cycle === 'monthly'
    ? subscription.amount * 12
    : notAmortizeYearly && subscription.cycle === 'annual'
      ? subscription.amount
      : subscription.amount

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-[rgba(240,235,225,0.35)] cursor-pointer ${
        isInactive ? 'opacity-50' : ''
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
      />

      {/* Name + next billing */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[13px] font-semibold text-foreground truncate ${isInactive ? 'line-through' : ''}`}>
            <HighlightText text={subscription.name} query={searchQuery} />
          </span>
          {isPaused && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 flex-shrink-0">
              Pausada
            </span>
          )}
          {isCancelled && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 flex-shrink-0">
              Cancelada
            </span>
          )}
          {isTrial && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 flex-shrink-0">
              Prueba
            </span>
          )}
        </div>
        {!isInactive && (
          <span className="text-xs text-text-tertiary">
            {billingToday ? (
              <span className="text-accent font-medium">Cobro hoy</span>
            ) : (
              `Próximo cobro: ${formatNextBilling(subscription.billing_day)}`
            )}
          </span>
        )}
      </div>

      {/* Cycle badge */}
      <Badge variant={subscription.cycle === "monthly" ? "blue" : "gold"}>
        {subscription.cycle === "monthly" ? "Mes" : "Año"}
      </Badge>

      {/* Amount */}
      <span className={`font-mono text-[13px] text-foreground min-w-[72px] text-right flex-shrink-0 ${isInactive ? 'line-through' : ''}`}>
        {formatCurrency(displayAmount)}
      </span>

      {/* Billing today dot */}
      {billingToday && !isInactive && (
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
      )}

      {/* Hover actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-sand hover:text-foreground transition-colors"
        >
          <Pencil size={13} strokeWidth={1.75} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleActive() }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-sand hover:text-foreground transition-colors"
        >
          {isPaused ? <Play size={13} strokeWidth={1.75} /> : <Pause size={13} strokeWidth={1.75} />}
        </button>
      </div>
    </div>
  )
}

// ─── Empty State ────────────────────

function EmptyState({ onNew, searchQuery }: { onNew: () => void; searchQuery: string }) {
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
