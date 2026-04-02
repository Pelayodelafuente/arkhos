"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Settings, Search, Download, X, Bell } from "lucide-react"
import { Button } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import { KPICards } from "./KPICards"
import { BudgetRing } from "./BudgetRing"
import { MiniDistributionChart } from "./MiniDistributionChart"
import { SpendingTrend } from "./SpendingTrend"
import { AlertBanner } from "./AlertBanner"
import { AlertSettings } from "./AlertSettings"
import { ExpenseCalendar } from "./ExpenseCalendar"
import { SubscriptionList } from "./SubscriptionList"
import { CycleFilterToggle } from "./CycleFilterToggle"
import { SubscriptionModal } from "./SubscriptionModal"
import { CategoryManager } from "./CategoryManager"
import { SmartAddModal } from "./SmartAddModal"
import { ShortcutsModal } from "./ShortcutsModal"
import { GastosLoading } from "./GastosLoading"
import { exportToCSV } from "@/lib/gastos-utils"
import type { SubscriptionWithCategory } from "@/types/expenses"

const AMORTIZE_STORAGE_KEY = "arkhos-expense-amortize"

interface ExpensesViewProps {
  userId: string
}

export function ExpensesView({ userId }: ExpensesViewProps) {
  const fetchSubscriptions = useExpensesStore((s) => s.fetchSubscriptions)
  const fetchCategories = useExpensesStore((s) => s.fetchCategories)
  const fetchSettings = useExpensesStore((s) => s.fetchSettings)
  const fetchMonthlySpending = useExpensesStore((s) => s.fetchMonthlySpending)
  const generateMissingPayments = useExpensesStore((s) => s.generateMissingPayments)
  const setSearchQuery = useExpensesStore((s) => s.setSearchQuery)
  const isLoading = useExpensesStore((s) => s.isLoading)
  const notAmortizeYearly = useExpensesStore((s) => s.notAmortizeYearly)
  const setNotAmortizeYearly = useExpensesStore((s) => s.setNotAmortizeYearly)
  const subscriptions = useExpensesStore((s) => s.subscriptions)
  const cycleFilter = useExpensesStore((s) => s.cycleFilter)

  const [localSearch, setLocalSearch] = useState("")
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<SubscriptionWithCategory | null>(null)
  const [prefilledDay, setPrefilledDay] = useState<number | null>(null)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [smartAddOpen, setSmartAddOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [alertSettingsOpen, setAlertSettingsOpen] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  // Restore amortization preference
  useEffect(() => {
    const stored = localStorage.getItem(AMORTIZE_STORAGE_KEY)
    if (stored !== null) setNotAmortizeYearly(stored === "true")
  }, [setNotAmortizeYearly])

  // Persist amortization preference
  useEffect(() => {
    localStorage.setItem(AMORTIZE_STORAGE_KEY, notAmortizeYearly.toString())
  }, [notAmortizeYearly])

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchSubscriptions(userId),
        fetchCategories(userId),
        fetchSettings(userId),
      ])
      // After subscriptions are loaded, generate missing payments and fetch spending
      await generateMissingPayments(userId)
      await fetchMonthlySpending(userId)
    }
    loadData()
  }, [userId, fetchSubscriptions, fetchCategories, fetchSettings, generateMissingPayments, fetchMonthlySpending])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(localSearch), 150)
    return () => clearTimeout(t)
  }, [localSearch, setSearchQuery])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case 'n': setEditingSub(null); setPrefilledDay(null); setModalOpen(true); break
        case 's':
        case '/': e.preventDefault(); setSearchExpanded(true); setTimeout(() => searchRef.current?.focus(), 50); break
        case 'g': break // Handled by ExpenseChartDialog internally
        case '?': setShortcutsOpen(true); break
        case 'Escape':
          setModalOpen(false)
          setSmartAddOpen(false)
          setShortcutsOpen(false)
          setCategoryManagerOpen(false)
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleNew = useCallback(() => {
    setEditingSub(null)
    setPrefilledDay(null)
    setModalOpen(true)
  }, [])

  const handleNewWithDay = useCallback((day: number) => {
    setEditingSub(null)
    setPrefilledDay(day)
    setModalOpen(true)
  }, [])

  const handleEdit = useCallback((sub: SubscriptionWithCategory) => {
    setEditingSub(sub)
    setPrefilledDay(null)
    setModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setModalOpen(false)
    setEditingSub(null)
    setPrefilledDay(null)
  }, [])

  const handleExportCSV = useCallback(() => {
    exportToCSV(subscriptions, 'arkhos-gastos')
  }, [subscriptions])

  return (
    <div>
      {/* Header */}
      <div className="mb-6 animate-fade-in-up">
        <h1 className="font-heading text-2xl text-foreground">Gastos</h1>
        <p className="mt-1 text-sm text-text-tertiary">
          Control de suscripciones y gastos recurrentes
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <CycleFilterToggle />

        {/* Search — collapsible */}
        <div
          className={`relative flex h-9 items-center overflow-hidden rounded-full border border-border bg-card transition-all ${
            searchExpanded ? 'w-[280px] px-3 gap-2' : 'w-9 justify-center cursor-pointer hover:bg-sand'
          }`}
          style={{
            transitionDuration: 'var(--transition-normal)',
            transitionTimingFunction: 'var(--ease-out-expo)',
          }}
          onClick={() => {
            if (!searchExpanded) {
              setSearchExpanded(true)
              setTimeout(() => searchRef.current?.focus(), 50)
            }
          }}
        >
          <Search size={14} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onBlur={() => { if (!localSearch) setSearchExpanded(false) }}
            tabIndex={searchExpanded ? 0 : -1}
            aria-label="Buscar suscripciones"
            className={`min-w-0 bg-transparent text-sm text-foreground placeholder:text-text-tertiary focus:outline-none transition-opacity ${
              searchExpanded ? 'flex-1 opacity-100' : 'w-0 opacity-0 pointer-events-none'
            }`}
            style={{ transitionDuration: 'var(--transition-fast)' }}
          />
          {localSearch && searchExpanded && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLocalSearch(""); setSearchQuery(""); searchRef.current?.focus() }}
              className="flex-shrink-0 text-text-tertiary hover:text-foreground cursor-pointer"
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Categories */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCategoryManagerOpen(true)}
          className="border border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
        >
          <Settings size={16} strokeWidth={1.75} />
          <span className="hidden sm:inline">Categorías</span>
        </Button>

        {/* Alert settings */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAlertSettingsOpen(true)}
          className="border border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
        >
          <Bell size={16} strokeWidth={1.75} />
          <span className="hidden sm:inline">Alertas</span>
        </Button>

        {/* CSV Export */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportCSV}
          className="border border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
          disabled={subscriptions.length === 0}
        >
          <Download size={16} strokeWidth={1.75} />
          <span className="hidden sm:inline">CSV</span>
        </Button>

        {/* Amortization toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="hidden sm:inline text-xs text-text-secondary whitespace-nowrap">
            Precio anual completo
          </span>
          <motion.button
            role="switch"
            aria-label="Mostrar precio anual completo"
            aria-checked={notAmortizeYearly}
            onClick={() => setNotAmortizeYearly(!notAmortizeYearly)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              notAmortizeYearly ? "bg-accent" : "bg-border"
            }`}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow"
              animate={{ x: notAmortizeYearly ? 18 : 3 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </label>

        {/* CTA */}
        <Button variant="primary" size="sm" onClick={handleNew}>
          <Plus size={16} strokeWidth={1.75} />
          <span className="hidden sm:inline">Suscripción</span>
        </Button>
      </div>

      {/* Main content — 2-column dashboard */}
      {isLoading ? (
        <GastosLoading />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={cycleFilter}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
              {/* Left column */}
              <div className="space-y-6 min-w-0">
                <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                  <KPICards />
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                  <AlertBanner />
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                  <ExpenseCalendar onNewWithDay={handleNewWithDay} onEdit={handleEdit} />
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                  <SubscriptionList onEdit={handleEdit} onNew={handleNew} />
                </div>
              </div>

              {/* Right column (sidebar) — sticky on desktop */}
              <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                {cycleFilter !== 'annual' && (
                  <div className="animate-fade-in-up" style={{ animationDelay: '130ms' }}>
                    <BudgetRing userId={userId} />
                  </div>
                )}
                <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                  <MiniDistributionChart />
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: '270ms' }}>
                  <SpendingTrend />
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Modals */}
      <SubscriptionModal
        key={editingSub?.id ?? 'new'}
        open={modalOpen}
        onClose={handleCloseModal}
        userId={userId}
        subscription={editingSub}
        prefilledDay={prefilledDay}
      />
      <CategoryManager
        open={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        userId={userId}
      />
      <SmartAddModal
        open={smartAddOpen}
        onClose={() => setSmartAddOpen(false)}
        userId={userId}
      />
      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      <AlertSettings
        open={alertSettingsOpen}
        onClose={() => setAlertSettingsOpen(false)}
        userId={userId}
      />
    </div>
  )
}
