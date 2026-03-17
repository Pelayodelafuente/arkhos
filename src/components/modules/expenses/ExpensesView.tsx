"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Settings, Search } from "lucide-react"
import { Button } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import { ExpenseSummaryCard } from "./ExpenseSummaryCard"
import { ExpenseCalendar } from "./ExpenseCalendar"
import { ExpenseLegend } from "./ExpenseLegend"
import { SubscriptionList } from "./SubscriptionList"
import { CycleFilterToggle } from "./CycleFilterToggle"
import { ExpenseChartDialog } from "./ExpenseChartDialog"
import { SmartAddButton } from "./SmartAddButton"
import { SubscriptionModal } from "./SubscriptionModal"
import { CategoryManager } from "./CategoryManager"
import type { SubscriptionWithCategory } from "@/types/expenses"

const AMORTIZE_STORAGE_KEY = "arkhos-expense-amortize"

interface ExpensesViewProps {
  userId: string
}

export function ExpensesView({ userId }: ExpensesViewProps) {
  const fetchSubscriptions = useExpensesStore((s) => s.fetchSubscriptions)
  const fetchCategories = useExpensesStore((s) => s.fetchCategories)
  const setSearchQuery = useExpensesStore((s) => s.setSearchQuery)
  const isLoading = useExpensesStore((s) => s.isLoading)
  const notAmortizeYearly = useExpensesStore((s) => s.notAmortizeYearly)
  const setNotAmortizeYearly = useExpensesStore((s) => s.setNotAmortizeYearly)

  const [localSearch, setLocalSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<SubscriptionWithCategory | null>(null)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)

  // Restore amortization preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(AMORTIZE_STORAGE_KEY)
    if (stored !== null) {
      setNotAmortizeYearly(stored === "true")
    }
  }, [setNotAmortizeYearly])

  // Persist amortization preference to localStorage on change
  useEffect(() => {
    localStorage.setItem(AMORTIZE_STORAGE_KEY, notAmortizeYearly.toString())
  }, [notAmortizeYearly])

  useEffect(() => {
    fetchSubscriptions(userId)
    fetchCategories(userId)
  }, [userId, fetchSubscriptions, fetchCategories])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(localSearch), 300)
    return () => clearTimeout(t)
  }, [localSearch, setSearchQuery])

  const handleNew = useCallback(() => {
    setEditingSub(null)
    setModalOpen(true)
  }, [])

  const handleEdit = useCallback((sub: SubscriptionWithCategory) => {
    setEditingSub(sub)
    setModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setModalOpen(false)
    setEditingSub(null)
  }, [])

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-foreground">Gastos</h1>
        <p className="mt-1 text-sm text-text-tertiary">
          Control de suscripciones y gastos recurrentes
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Left: Cycle filter */}
        <CycleFilterToggle />

        {/* Center: Search + Smart Add */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={15}
            strokeWidth={1.75}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            placeholder="Buscar suscripcion..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>

        <SmartAddButton />

        {/* Right: Actions */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCategoryManagerOpen(true)}
          className="border border-border"
        >
          <Settings size={16} strokeWidth={1.75} />
          <span className="hidden sm:inline">Categorias</span>
        </Button>

        <ExpenseChartDialog />

        {/* Amortization toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="hidden sm:inline text-xs text-text-secondary whitespace-nowrap">
            Precio anual completo
          </span>
          <button
            role="switch"
            aria-checked={notAmortizeYearly}
            onClick={() => setNotAmortizeYearly(!notAmortizeYearly)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              notAmortizeYearly ? "bg-accent" : "bg-border"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                notAmortizeYearly ? "translate-x-[18px]" : "translate-x-[3px]"
              }`}
            />
          </button>
        </label>

        <Button variant="primary" size="sm" onClick={handleNew}>
          <Plus size={16} strokeWidth={1.75} />
          <span className="hidden sm:inline">Suscripcion</span>
        </Button>
      </div>

      {/* Main content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-6">
          <ExpenseSummaryCard />
          <ExpenseCalendar />
          <ExpenseLegend />
          <SubscriptionList onEdit={handleEdit} onNew={handleNew} />
        </div>
      )}

      {/* Modals */}
      <SubscriptionModal
        open={modalOpen}
        onClose={handleCloseModal}
        userId={userId}
        subscription={editingSub}
      />
      <CategoryManager
        open={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        userId={userId}
      />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-[120px] animate-pulse rounded-xl bg-sand" />
      <div className="h-[380px] animate-pulse rounded-xl bg-sand" />
      <div className="h-[200px] animate-pulse rounded-xl bg-sand" />
    </div>
  )
}
