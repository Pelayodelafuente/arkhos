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
      toast('Suscripcion anadida', 'success')
      const client = createClient()
      logActivity(client, data.user_id, 'gastos', 'subscription_created', created.name)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al anadir suscripcion'
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
      toast('Suscripcion actualizada', 'success')
      const client = createClient()
      logActivity(client, updated.user_id, 'gastos', 'subscription_updated', updated.name)
    } catch (e) {
      set({ subscriptions: prev })
      const msg = e instanceof Error ? e.message : 'Error al actualizar suscripcion'
      toast(msg, 'error')
    }
  },

  removeSubscription: async (id) => {
    const prev = get().subscriptions
    set((s) => ({ subscriptions: s.subscriptions.filter((sub) => sub.id !== id) }))

    try {
      await deleteSubscriptionApi(id)
      toast('Suscripcion eliminada', 'success')
      const removed = prev.find((s) => s.id === id)
      if (removed) {
        const client = createClient()
        logActivity(client, removed.user_id, 'gastos', 'subscription_deleted', removed.name)
      }
    } catch (e) {
      set({ subscriptions: prev })
      const msg = e instanceof Error ? e.message : 'Error al eliminar suscripcion'
      toast(msg, 'error')
    }
  },

  toggleActive: async (id) => {
    const prev = get().subscriptions
    const sub = prev.find((s) => s.id === id)
    if (!sub) return

    const newActive = !sub.is_active
    // Optimistic
    set((s) => ({
      subscriptions: s.subscriptions.map((x) =>
        x.id === id ? { ...x, is_active: newActive } : x
      ),
    }))

    try {
      await toggleSubscriptionActiveApi(id, newActive)
      const client = createClient()
      logActivity(client, sub.user_id, 'gastos', 'subscription_toggled', sub.name, newActive ? 'activada' : 'pausada')
    } catch (e) {
      set({ subscriptions: prev })
      const msg = e instanceof Error ? e.message : 'Error al cambiar estado de suscripcion'
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
      toast(`Suscripcion ${status === 'active' ? 'activada' : status === 'paused' ? 'pausada' : status === 'cancelled' ? 'cancelada' : 'en prueba'}`, 'success')
      const client = createClient()
      logActivity(client, sub.user_id, 'gastos', 'subscription_status_changed', sub.name, status)
    } catch (e) {
      set({ subscriptions: prev })
      const msg = e instanceof Error ? e.message : 'Error al cambiar estado de suscripcion'
      toast(msg, 'error')
    }
  },

  // ── Categories ──────────────────────

  addCategory: async (data) => {
    try {
      const created = await createExpenseCategoryApi(data)
      set((s) => ({ categories: [...s.categories, created] }))
      toast('Categoria anadida', 'success')
      const client = createClient()
      logActivity(client, data.user_id, 'gastos', 'category_created', created.name)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al anadir categoria'
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
      toast('Categoria actualizada', 'success')
    } catch (e) {
      set({ categories: prev })
      const msg = e instanceof Error ? e.message : 'Error al actualizar categoria'
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
      toast('Categoria eliminada', 'success')
      if (removed) {
        const client = createClient()
        logActivity(client, removed.user_id, 'gastos', 'category_deleted', removed.name)
      }
    } catch (e) {
      set({ categories: prev })
      const msg = e instanceof Error ? e.message : 'Error al eliminar categoria'
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
}))

// ══════════════════════════════════════
// SELECTORS
// ══════════════════════════════════════

/**
 * Suscripciones filtradas por cycleFilter + searchQuery.
 * Muestra TODAS las suscripciones (activas, pausadas, canceladas, trial),
 * pero ordena activas primero.
 */
export function useFilteredSubscriptions(): SubscriptionWithCategory[] {
  const subscriptions = useExpensesStore((s) => s.subscriptions)
  const cycleFilter = useExpensesStore((s) => s.cycleFilter)
  const searchQuery = useExpensesStore((s) => s.searchQuery)

  const filtered = subscriptions.filter((sub) => {
    if (cycleFilter !== 'all' && sub.cycle !== cycleFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        sub.name.toLowerCase().includes(q) ||
        (sub.category?.name ?? '').toLowerCase().includes(q) ||
        (sub.notes ?? '').toLowerCase().includes(q)
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
 * Usa getSubscriptionsForDay() de expenses-calendar.ts.
 */
export function useSubscriptionsByDay(
  year: number,
  month: number
): Map<number, SubscriptionWithCategory[]> {
  const subscriptions = useExpensesStore((s) => s.subscriptions)

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
 * Resumen financiero.
 * si notAmortizeYearly=false: totalMonthlyEstimate = totalMonthly + totalAnnual/12
 * si notAmortizeYearly=true:  totalMonthlyEstimate = totalMonthly + totalAnnual
 * countActive: total de suscripciones activas (status active o trial)
 */
export function useExpenseSummary(): ExpenseSummary {
  const subscriptions = useExpensesStore((s) => s.subscriptions)
  const notAmortizeYearly = useExpensesStore((s) => s.notAmortizeYearly)

  let totalMonthly = 0
  let totalAnnual = 0
  let countMonthly = 0
  let countAnnual = 0
  let countActive = 0

  for (const sub of subscriptions) {
    if (!sub.is_active) continue
    countActive++
    if (sub.cycle === 'monthly') {
      totalMonthly += sub.amount
      countMonthly++
    } else {
      totalAnnual += sub.amount
      countAnnual++
    }
  }

  const totalMonthlyEstimate = notAmortizeYearly
    ? totalMonthly + totalAnnual
    : totalMonthly + totalAnnual / 12

  return {
    totalMonthly,
    totalAnnual,
    totalMonthlyEstimate,
    countMonthly,
    countAnnual,
    countActive,
  }
}

/**
 * Total monetario de un dia concreto del calendario.
 */
export function useDayTotal(day: number, year: number, month: number): number {
  const subscriptions = useExpensesStore((s) => s.subscriptions)
  const subs = getSubscriptionsForDay(subscriptions, day, year, month)
  return subs.reduce((acc, sub) => acc + sub.amount, 0)
}
