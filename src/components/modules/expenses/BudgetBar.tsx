"use client"

import { useState } from "react"
import { Check, X, Target } from "lucide-react"
import { useExpensesStore, useExpenseSummary } from "@/stores/expenses-store"
import { formatCurrency } from "@/lib/gastos-utils"

interface BudgetBarProps {
  userId: string
}

export function BudgetBar({ userId }: BudgetBarProps) {
  const settings = useExpensesStore((s) => s.settings)
  const updateSettings = useExpensesStore((s) => s.updateSettings)
  const summary = useExpenseSummary()
  const [editing, setEditing] = useState(false)
  const [budgetInput, setBudgetInput] = useState("")

  const budget = settings?.monthly_budget ?? null
  const spent = summary.totalMonthly
  const percentage = budget && budget > 0 ? Math.min((spent / budget) * 100, 100) : 0

  const getBarColor = () => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-amber-500'
    return 'bg-[var(--module-gastos)]'
  }

  const getTextColor = () => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-amber-600'
    return 'text-[var(--module-gastos)]'
  }

  const getBorderColor = () => {
    if (percentage >= 90) return 'border-red-200'
    if (percentage >= 75) return 'border-amber-200'
    return 'border-border'
  }

  const handleSave = async () => {
    const value = parseFloat(budgetInput)
    if (!isNaN(value) && value > 0) {
      await updateSettings(userId, { monthly_budget: value })
    }
    setEditing(false)
    setBudgetInput("")
  }

  const handleStartEdit = () => {
    setBudgetInput(budget ? String(budget) : "")
    setEditing(true)
  }

  if (budget === null && !editing) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-3 flex items-center gap-3">
        <Target size={16} strokeWidth={1.5} className="text-text-tertiary flex-shrink-0" />
        <button
          onClick={handleStartEdit}
          className="text-sm text-[var(--module-gastos)] hover:text-accent transition-colors cursor-pointer"
        >
          Define un presupuesto mensual para controlar tus gastos →
        </button>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-border px-4 py-3 flex items-center gap-2">
        <Target size={16} strokeWidth={1.5} className="text-text-tertiary flex-shrink-0" />
        <span className="text-xs text-text-secondary">Presupuesto:</span>
        <input
          type="number"
          value={budgetInput}
          onChange={(e) => setBudgetInput(e.target.value)}
          placeholder="200"
          className="w-24 rounded-md border border-border bg-card px-2 py-1 text-sm font-mono text-foreground focus:border-accent focus:outline-none"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
        <span className="text-xs text-text-tertiary">€/mes</span>
        <button onClick={handleSave} className="text-emerald-600 hover:text-emerald-700">
          <Check size={14} strokeWidth={2} />
        </button>
        <button onClick={() => setEditing(false)} className="text-text-tertiary hover:text-foreground">
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border ${getBorderColor()} px-4 py-3`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Target size={14} strokeWidth={1.5} className="text-text-tertiary" />
          <span className="text-xs text-text-tertiary">Presupuesto mensual</span>
        </div>
        <button
          onClick={handleStartEdit}
          className="text-[10px] text-text-tertiary hover:text-accent transition-colors"
        >
          Editar
        </button>
      </div>
      <div className="h-2.5 w-full rounded-full bg-sand overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${getBarColor()}`}
          style={{ width: `${percentage}%`, transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </div>
      <p className="mt-1 text-xs text-text-tertiary">
        {formatCurrency(spent)} de {formatCurrency(budget!)}{' '}
        <span className={`font-mono font-semibold ${getTextColor()}`}>
          ({percentage.toFixed(1)}%)
        </span>
      </p>
    </div>
  )
}
