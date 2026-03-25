// ══════════════════════════════════════
// Arkhos — Expenses Store (Zustand)
// Módulo Gastos: optimistic updates + rollback + Toast
// ══════════════════════════════════════

import { create } from 'zustand'
import {
  getSubscriptions,
  getExpenseCategories,
  createSubscription as createSubscriptionApi,
  updateSubscription as updateSubscriptionApi,
  deleteSubscription as deleteSubscriptionApi,
  toggleSubscriptionActive as toggleSubscriptionActiveApi,
  createExpenseCategory as createExpenseCategoryApi,
  updateExpenseCategory as updateExpenseCategoryApi,
  deleteExpenseCategory as deleteExpenseCategoryApi,
  getPriceHistory,
  getUserGastosSettings,
  upsertUserGastosSettings,
  updateSubscriptionStatus as updateSubscriptionStatusApi,
  getPayments as getPaymentsApi,
  createPayment as createPaymentApi,
  deletePayment as deletePaymentApi,
  getMonthlySpending as getMonthlySpendingApi,
  autoGeneratePayments,
} from '@/lib/supabase/expenses'
import { logActivity } from '@/lib/supabase/activity'
import { createClient } from '@/lib/supabase/client'
import type {
  Subscription,
  SubscriptionWithCategory,
  SubscriptionInsert,
  SubscriptionUpdate,
  SubscriptionStatus,
  ExpenseCategory,
  ExpenseCategoryInsert,
  ExpenseCategoryUpdate,
  CycleFilter,
  ExpenseSummary,
  UserGastosSettings,
  UserGastosSettingsUpdate,
  PriceHistoryEntry,
  SubscriptionPayment,
  SubscriptionPaymentInsert,
  MonthlySpending,
} from '@/types/expenses'
import { getSubscriptionsForDay } from '@/utils/expenses-calendar'
import { useUIStore } from './ui-store'

// ─── Toast helper ─────────────────────

function toast(message: string, variant: 'success' | 'error') {
  useUIStore.getState().addToast(message, variant)
}

// ─── Store interface ──────────────────

interface ExpensesState {
  subscriptions: SubscriptionWithCategory[]
  categories: ExpenseCategory[]
  cycleFilter: CycleFilter
  searchQuery: string
  isLoading: boolean
  selectedDay: number | null
  notAmortizeYearly: boolean // si true: anuales se muestran como precio completo sin /12
  settings: UserGastosSettings | null
  priceHistory: Map<string, PriceHistoryEntry[]>
  listViewMode: 'category' | 'chronological'
  collapsedCategories: Set<string>
  viewedYear: number
  viewedMonth: number
  payments: SubscriptionPayment[]
  monthlySpending: MonthlySpending[]
}

interface ExpensesActions {
  fetchSubscriptions: (userId: string) => Promise<void>
  fetchCategories: (userId: string) => Promise<void>
  addSubscription: (data: SubscriptionInsert) => Promise<void>
  editSubscription: (id: string, data: SubscriptionUpdate) => Promise<void>
  removeSubscription: (id: string) => Promise<void>
  toggleActive: (id: string) => Promise<void>
  setCycleFilter: (filter: CycleFilter) => void
  setSearchQuery: (query: string) => void
  setSelectedDay: (day: number | null) => void
  setNotAmortizeYearly: (value: boolean) => void
  addCategory: (data: ExpenseCategoryInsert) => Promise<void>
  editCategory: (id: string, data: ExpenseCategoryUpdate) => Promise<void>
  removeCategory: (id: string) => Promise<void>
  fetchSettings: (userId: string) => Promise<void>
  updateSettings: (userId: string, data: UserGastosSettingsUpdate) => Promise<void>
  fetchPriceHistory: (subscriptionId: string) => Promise<void>
  updateStatus: (id: string, status: SubscriptionStatus) => Promise<void>
  setListViewMode: (mode: 'category' | 'chronological') => void
  toggleCategoryCollapse: (categoryId: string) => void
  setViewedMonth: (year: number, month: number) => void
  fetchPayments: (userId: string) => Promise<void>
  fetchMonthlySpending: (userId: string, months?: number) => Promise<void>
  addPayment: (data: SubscriptionPaymentInsert) => Promise<void>
  removePayment: (id: string) => Promise<void>
  generateMissingPayments: (userId: string) => Promise<void>
}

type ExpensesStore = ExpensesState & ExpensesActions

// ─── Store ────────────────────────────

export const useExpensesStore = create<ExpensesStore>((set, get) => ({
  // State
  subscriptions: [],
  categories: [],
  cycleFilter: 'all',
  searchQuery: '',
  isLoading: false,
  selectedDay: null,
  notAmortizeYearly: false,
  settings: null,
  priceHistory: new Map(),
  listViewMode: 'category',
  collapsedCategories: new Set(),
  viewedYear: new Date().getFullYear(),
  viewedMonth: new Date().getMonth() + 1,
  payments: [],
  monthlySpending: [],

  // ── Fetch ───────────────────────────

  fetchSubscriptions: async (userId) => {
    set({ isLoading: true })
    try {
      const subscriptions = await getSubscriptions(userId)
      set({ subscriptions, isLoading: false })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar suscripciones'
      set({ isLoading: false })
      toast(msg, 'error')
    }
  },

  fetchCategories: async (userId) => {
    try {
      const categories = await getExpenseCategories(userId)
      set({ categories })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar categorías'
      toast(msg, 'error')
    }
  },

  // ── Settings ──────────────────────

  fetchSettings: async (userId) => {
    try {
      const settings = await getUserGastosSettings(userId)
      if (settings) {
        set({
          settings,
          listViewMode: settings.list_view_mode,
          collapsedCategories: new Set(settings.collapsed_categories),
        })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar ajustes de gastos'
      toast(msg, 'error')
    }
  },

  updateSettings: async (userId, data) => {
    const prev = get().settings
    // Optimistic update
    if (prev) {
      set({
        settings: { ...prev, ...data, updated_at: new Date().toISOString() },
        ...(data.list_view_mode !== undefined && { listViewMode: data.list_view_mode }),
        ...(data.collapsed_categories !== undefined && {
          collapsedCategories: new Set(data.collapsed_categories),
        }),
      })
    }

    try {
      const updated = await upsertUserGastosSettings(userId, data)
      set({
        settings: updated,
        listViewMode: updated.list_view_mode,
        collapsedCategories: new Set(updated.collapsed_categories),
      })
    } catch (e) {
      // Rollback
      if (prev) {
        set({
          settings: prev,
          listViewMode: prev.list_view_mode,
          collapsedCategories: new Set(prev.collapsed_categories),
        })
      }
      const msg = e instanceof Error ? e.message : 'Error al actualizar ajustes'
      toast(msg, 'error')
    }
  },

  // ── Price History ─────────────────

  fetchPriceHistory: async (subscriptionId) => {
    try {
      const entries = await getPriceHistory(subscriptionId)
      set((s) => {
        const next = new Map(s.priceHistory)
        next.set(subscriptionId, entries)
        return { priceHistory: next }
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar historial de precios'
      toast(msg, 'error')
    }
  },

  // ── Subscriptions ───────────────────

  addSubscription: async (data) => {
    try {
      const created: Subscription = await createSubscriptionApi(data)
      const category = get().categories.find((c) => c.id === created.category_id) ?? null
      const withCategory: SubscriptionWithCategory = { ...created, category }
      set((s) => ({ subscriptions: [...s.subscriptions, withCategory] }))
      toast('Suscripción añadida', 'success')
      const client = createClient()
      logActivity(client, data.user_id, 'gastos', 'subscription_created', created.name)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al añadir suscripción'
      toast(msg, 'error')
    }
  },

  editSubscription: async (id, data) => {
    const prev = get().subscriptions
    // Optimistic update
    set((s) => ({
      subscriptions: s.subscriptions.map((sub) =>
        sub.id === id
          ? {
              ...sub,
              ...data,
              // Actualizar referencia de categoria si cambia category_id
              category:
                'category_id' in data
                  ? (s.subscriptions
                      .find((x) => x.id === id)
                      ?.category ?? null)
                  : sub.category,
            }
          : sub
      ),
    }))

    try {
      const updated = await updateSubscriptionApi(id, data)
      // Si cambio category_id, resolver la categoria actualizada
      const category = get().categories.find((c) => c.id === updated.category_id) ?? null
      set((s) => ({
        subscriptions: s.subscriptions.map((sub) =>
          sub.id === id ? { ...updated, category } : sub
        ),
      }))
      toast('Suscripción actualizada', 'success')
      const client = createClient()
      logActivity(client, updated.user_id, 'gastos', 'subscription_updated', updated.name)
    } catch (e) {
      set({ subscriptions: prev })
      const msg = e instanceof Error ? e.message : 'Error al actualizar suscripción'
      toast(msg, 'error')
    }
  },

  removeSubscription: async (id) => {
    const prev = get().subscriptions
    set((s) => ({ subscriptions: s.subscriptions.filter((sub) => sub.id !== id) }))

    try {
      await deleteSubscriptionApi(id)
      toast('Suscripción eliminada', 'success')
      const removed = prev.find((s) => s.id === id)
      if (removed) {
        const client = createClient()
        logActivity(client, removed.user_id, 'gastos', 'subscription_deleted', removed.name)
      }
    } catch (e) {
      set({ subscriptions: prev })
      const msg = e instanceof Error ? e.message : 'Error al eliminar suscripción'
      toast(msg, 'error')
    }
  },

  toggleActive: async (id) => {
    const prev = get().subscriptions
    const sub = prev.find((s) => s.id === id)
    if (!sub) return

    const newActive = !sub.is_active
    const newStatus = newActive ? 'active' : 'paused'
    // Optimistic: update both is_active and status so UI reflects pause immediately
    set((s) => ({
      subscriptions: s.subscriptions.map((x) =>
        x.id === id ? { ...x, is_active: newActive, status: newStatus as SubscriptionStatus } : x
      ),
    }))

    try {
      await toggleSubscriptionActiveApi(id, newActive)
      const client = createClient()
      logActivity(client, sub.user_id, 'gastos', 'subscription_toggled', sub.name, newActive ? 'activada' : 'pausada')
      toast(`${sub.name} ${newActive ? 'reactivada' : 'pausada'}`, 'success')
    } catch (e) {
      set({ subscriptions: prev })
      const msg = e instanceof Error ? e.message : 'Error al cambiar estado de suscripción'
      toast(msg, 'error')
    }
  },

  updateStatus: async (id, status) => {
    const prev = get().subscriptions
    const sub = prev.find((s) => s.id === id)
    if (!sub) return

    const isActive = status === 'active' || status === 'trial'
    // Optimistic
    set((s) => ({
      subscriptions: s.subscriptions.map((x) =>
        x.id === id
          ? {
              ...x,
              status,
              is_active: isActive,
              ...(status === 'cancelled' && { cancelled_at: new Date().toISOString() }),
            }
          : x
      ),
    }))

    try {
      const updated = await updateSubscriptionStatusApi(id, status)
      const category = get().categories.find((c) => c.id === updated.category_id) ?? null
      set((s) => ({
        subscriptions: s.subscriptions.map((x) =>
          x.id === id ? { ...updated, category } : x
        ),
      }))
      toast(`Suscripción ${status === 'active' ? 'activada' : status === 'paused' ? 'pausada' : status === 'cancelled' ? 'cancelada' : 'en prueba'}`, 'success')
      const client = createClient()
      logActivity(client, sub.user_id, 'gastos', 'subscription_status_changed', sub.name, status)
    } catch (e) {
      set({ subscriptions: prev })
      const msg = e instanceof Error ? e.message : 'Error al cambiar estado de suscripción'
      toast(msg, 'error')
    }
  },

  // ── Categories ──────────────────────

  addCategory: async (data) => {
    try {
      const created = await createExpenseCategoryApi(data)
      set((s) => ({ categories: [...s.categories, created] }))
      toast('Categoría añadida', 'success')
      const client = createClient()
      logActivity(client, data.user_id, 'gastos', 'category_created', created.name)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al añadir categoría'
      toast(msg, 'error')
    }
  },

  editCategory: async (id, data) => {
    const prev = get().categories
    // Optimistic
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }))

    try {
      const updated = await updateExpenseCategoryApi(id, data)
      set((s) => ({
        categories: s.categories.map((c) => (c.id === id ? updated : c)),
        // Actualizar la referencia de categoria en suscripciones
        subscriptions: s.subscriptions.map((sub) =>
          sub.category?.id === id ? { ...sub, category: updated } : sub
        ),
      }))
      toast('Categoría actualizada', 'success')
    } catch (e) {
      set({ categories: prev })
      const msg = e instanceof Error ? e.message : 'Error al actualizar categoría'
      toast(msg, 'error')
    }
  },

  removeCategory: async (id) => {
    const prev = get().categories
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }))

    try {
      await deleteExpenseCategoryApi(id)
      const removed = prev.find((c) => c.id === id)
      // Desasociar la categoria de las suscripciones afectadas
      set((s) => ({
        subscriptions: s.subscriptions.map((sub) =>
          sub.category_id === id ? { ...sub, category_id: null, category: null } : sub
        ),
      }))
      toast('Categoría eliminada', 'success')
      if (removed) {
        const client = createClient()
        logActivity(client, removed.user_id, 'gastos', 'category_deleted', removed.name)
      }
    } catch (e) {
      set({ categories: prev })
      const msg = e instanceof Error ? e.message : 'Error al eliminar categoría'
      toast(msg, 'error')
    }
  },

  // ── UI state ────────────────────────

  setCycleFilter: (filter) => set({ cycleFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedDay: (day) => set({ selectedDay: day }),
  setNotAmortizeYearly: (value) => set({ notAmortizeYearly: value }),

  setListViewMode: (mode) => set({ listViewMode: mode }),

  setViewedMonth: (year, month) => set({ viewedYear: year, viewedMonth: month }),

  toggleCategoryCollapse: (categoryId) => {
    set((s) => {
      const next = new Set(s.collapsedCategories)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return { collapsedCategories: next }
    })
  },

  // ── Payments ─────────────────────────

  fetchPayments: async (userId) => {
    try {
      const payments = await getPaymentsApi(userId)
      set({ payments })
    } catch {
      set({ payments: [] })
    }
  },

  fetchMonthlySpending: async (userId, months) => {
    try {
      const monthlySpending = await getMonthlySpendingApi(userId, months)
      set({ monthlySpending })
    } catch {
      set({ monthlySpending: [] })
    }
  },

  addPayment: async (data) => {
    try {
      const created = await createPaymentApi(data)
      set((s) => ({ payments: [created, ...s.payments] }))
      toast('Pago registrado', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al registrar pago'
      toast(msg, 'error')
    }
  },

  removePayment: async (id) => {
    const prev = get().payments
    set((s) => ({ payments: s.payments.filter((p) => p.id !== id) }))

    try {
      await deletePaymentApi(id)
      toast('Pago eliminado', 'success')
    } catch (e) {
      set({ payments: prev })
      const msg = e instanceof Error ? e.message : 'Error al eliminar pago'
      toast(msg, 'error')
    }
  },

  generateMissingPayments: async (userId) => {
    try {
      const subs = get().subscriptions
      const count = await autoGeneratePayments(userId, subs)
      if (count > 0) {
        // Refresh monthly spending after generating
        const monthlySpending = await getMonthlySpendingApi(userId)
        const payments = await getPaymentsApi(userId)
        set({ monthlySpending, payments })
      }
    } catch {
      // subscription_payments table may not exist yet — silently skip
    }
  },
}))

// ══════════════════════════════════════
// SELECTORS
// ══════════════════════════════════════

/**
 * Suscripciones filtradas solo por cycleFilter (sin searchQuery).
 * Usada por KPIs, calendario, banner y budget para respetar el filtro de ciclo.
 * Cuando cycleFilter='monthly', incluye también suscripciones anuales que cobran en viewedMonth.
 */
export function useCycleFilteredSubscriptions(): SubscriptionWithCategory[] {
  const subscriptions = useExpensesStore((s) => s.subscriptions)
  const cycleFilter = useExpensesStore((s) => s.cycleFilter)
  const viewedMonth = useExpensesStore((s) => s.viewedMonth)

  if (cycleFilter === 'all') return subscriptions
  if (cycleFilter === 'monthly') {
    return subscriptions.filter((sub) => {
      if (sub.cycle === 'monthly') return true
      if (sub.cycle === 'annual' && sub.started_at) {
        return new Date(sub.started_at).getMonth() + 1 === viewedMonth
      }
      return false
    })
  }
  return subscriptions.filter((sub) => sub.cycle === cycleFilter)
}

/**
 * Suscripciones filtradas por cycleFilter + searchQuery.
 * Muestra TODAS las suscripciones (activas, pausadas, canceladas, trial),
 * pero ordena activas primero.
 */
export function useFilteredSubscriptions(): SubscriptionWithCategory[] {
  const subscriptions = useExpensesStore((s) => s.subscriptions)
  const cycleFilter = useExpensesStore((s) => s.cycleFilter)
  const searchQuery = useExpensesStore((s) => s.searchQuery)
  const viewedMonth = useExpensesStore((s) => s.viewedMonth)

  const cycleMatch = (sub: SubscriptionWithCategory): boolean => {
    if (cycleFilter === 'all') return true
    if (cycleFilter === 'monthly') {
      if (sub.cycle === 'monthly') return true
      if (sub.cycle === 'annual' && sub.started_at) {
        return new Date(sub.started_at).getMonth() + 1 === viewedMonth
      }
      return false
    }
    return sub.cycle === cycleFilter
  }

  const filtered = subscriptions.filter((sub) => {
    if (!cycleMatch(sub)) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        sub.name.toLowerCase().includes(q) ||
        (sub.category?.name ?? '').toLowerCase().includes(q) ||
        (sub.notes ?? '').toLowerCase().includes(q) ||
        (sub.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
      )
    }
    return true
  })

  // Sort: active/trial first, then paused, then cancelled
  const statusOrder: Record<string, number> = {
    active: 0,
    trial: 1,
    paused: 2,
    cancelled: 3,
  }

  return filtered.sort((a, b) => {
    const aOrder = statusOrder[a.status] ?? 0
    const bOrder = statusOrder[b.status] ?? 0
    if (aOrder !== bOrder) return aOrder - bOrder
    return a.billing_day - b.billing_day
  })
}

/**
 * Map<billing_day, SubscriptionWithCategory[]> para el calendario.
 * Respeta cycleFilter. Usa getSubscriptionsForDay() de expenses-calendar.ts.
 */
export function useSubscriptionsByDay(
  year: number,
  month: number
): Map<number, SubscriptionWithCategory[]> {
  const subscriptions = useCycleFilteredSubscriptions()

  const map = new Map<number, SubscriptionWithCategory[]>()

  // Dias del mes (1-based)
  const daysInMonth = new Date(year, month, 0).getDate()

  for (let day = 1; day <= daysInMonth; day++) {
    const subs = getSubscriptionsForDay(subscriptions, day, year, month)
    if (subs.length > 0) {
      map.set(day, subs)
    }
  }

  return map
}

/**
 * Resumen financiero. Respeta cycleFilter.
 * totalMonthlyEstimate = totalMonthly + totalQuarterly/3 + totalSemiannual/6 + totalAnnual/12
 * (cuando notAmortizeYearly=true, no se dividen — se suman directamente)
 * countActive: total de suscripciones activas (status active o trial)
 */
/**
 * Returns true if a non-monthly subscription actually bills in the given month/year.
 * Falls back to always-visible if no started_at (legacy data).
 */
function isSubBillingInViewedMonth(
  startedAt: string | null,
  viewedYear: number,
  viewedMonth: number,
  periodMonths: number
): boolean {
  if (!startedAt) return true
  const start = new Date(startedAt)
  const monthsDiff = (viewedYear - start.getFullYear()) * 12 + (viewedMonth - (start.getMonth() + 1))
  return monthsDiff >= 0 && monthsDiff % periodMonths === 0
}

export function useExpenseSummary(): ExpenseSummary {
  const subscriptions = useCycleFilteredSubscriptions()
  const notAmortizeYearly = useExpensesStore((s) => s.notAmortizeYearly)
  const viewedYear = useExpensesStore((s) => s.viewedYear)
  const viewedMonth = useExpensesStore((s) => s.viewedMonth)

  let totalMonthly = 0
  let totalQuarterly = 0
  let totalSemiannual = 0
  let totalAnnual = 0
  let countMonthly = 0
  let countQuarterly = 0
  let countSemiannual = 0
  let countAnnual = 0
  let countActive = 0

  for (const sub of subscriptions) {
    if (!sub.is_active) continue
    countActive++
    switch (sub.cycle) {
      case 'monthly':
        totalMonthly += sub.amount
        countMonthly++
        break
      case 'quarterly':
        if (isSubBillingInViewedMonth(sub.started_at, viewedYear, viewedMonth, 3)) {
          totalQuarterly += sub.amount
          countQuarterly++
        }
        break
      case 'semiannual':
        if (isSubBillingInViewedMonth(sub.started_at, viewedYear, viewedMonth, 6)) {
          totalSemiannual += sub.amount
          countSemiannual++
        }
        break
      case 'annual':
        if (isSubBillingInViewedMonth(sub.started_at, viewedYear, viewedMonth, 12)) {
          totalAnnual += sub.amount
          countAnnual++
        }
        break
    }
  }

  const totalMonthlyEstimate = notAmortizeYearly
    ? totalMonthly + totalQuarterly + totalSemiannual + totalAnnual
    : totalMonthly + totalQuarterly / 3 + totalSemiannual / 6 + totalAnnual / 12

  return {
    totalMonthly,
    totalQuarterly,
    totalSemiannual,
    totalAnnual,
    totalMonthlyEstimate,
    countMonthly,
    countQuarterly,
    countSemiannual,
    countAnnual,
    countActive,
  }
}

/**
 * Total monetario de un dia concreto del calendario.
 */
export function useDayTotal(day: number, year: number, month: number): number {
  const subscriptions = useCycleFilteredSubscriptions()
  const subs = getSubscriptionsForDay(subscriptions, day, year, month)
  return subs.reduce((acc, sub) => acc + sub.amount, 0)
}
