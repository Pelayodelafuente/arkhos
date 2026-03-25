"use client"

import { useState } from "react"
import { Check, X, Target } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Card } from "@/components/ui"
import { useExpensesStore, useExpenseSummary } from "@/stores/expenses-store"
import { formatCurrency } from "@/lib/gastos-utils"

interface BudgetRingProps {
  userId: string
}

const RING_SIZE = 140
const STROKE_WIDTH = 10
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function getRingColor(percentage: number): string {
  if (percentage >= 90) return "#C4704A"
  if (percentage >= 70) return "#9a6a28"
  return "#056b63"
}

function getTextColor(percentage: number): string {
  if (percentage >= 90) return "text-[#C4704A]"
  if (percentage >= 70) return "text-[#9a6a28]"
  return "text-[#056b63]"
}

export function BudgetRing({ userId }: BudgetRingProps) {
  const settings = useExpensesStore((s) => s.settings)
  const updateSettings = useExpensesStore((s) => s.updateSettings)
  const summary = useExpenseSummary()
  const prefersReducedMotion = useReducedMotion()
  const [editing, setEditing] = useState(false)
  const [budgetInput, setBudgetInput] = useState("")

  const budget = settings?.monthly_budget ?? null
  const spent = summary.totalMonthlyEstimate
  const percentage = budget && budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const ringColor = budget ? getRingColor(percentage) : "#9a7a5a"

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

  // No budget set — dashed ring
  if (budget === null && !editing) {
    return (
      <Card padding="md">
        <div className="flex flex-col items-center gap-3 py-2">
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className="transform -rotate-90"
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--border-stone)"
              strokeWidth={STROKE_WIDTH}
              strokeDasharray="8 6"
              opacity={0.5}
            />
          </svg>
          <div className="text-center -mt-2">
            <p className="text-xs text-text-tertiary mb-1">Sin presupuesto</p>
            <button
              onClick={handleStartEdit}
              className="text-xs text-[var(--module-gastos)] hover:text-accent transition-colors cursor-pointer font-medium"
            >
              Definir presupuesto mensual
            </button>
          </div>
        </div>
      </Card>
    )
  }

  // Editing state
  if (editing) {
    return (
      <Card padding="md">
        <div className="flex flex-col items-center gap-3 py-2">
          <Target size={20} strokeWidth={1.5} className="text-text-tertiary" />
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="200"
              className="w-24 rounded-md border border-border bg-card px-2 py-1.5 text-sm font-mono text-foreground text-center focus:border-accent focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
                if (e.key === "Escape") setEditing(false)
              }}
            />
            <span className="text-xs text-text-tertiary">&euro;/mes</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
              <Check size={14} strokeWidth={2} />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-sand text-text-tertiary hover:text-foreground transition-colors"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="md">
      <div className="flex flex-col items-center">
        {/* SVG Ring */}
        <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className="transform -rotate-90"
          >
            {/* Background ring */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--border-stone)"
              strokeWidth={STROKE_WIDTH}
              opacity={0.3}
            />
            {/* Animated foreground ring */}
            <motion.circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              {...(prefersReducedMotion
                ? {
                    strokeDashoffset:
                      CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE,
                  }
                : {
                    initial: { strokeDashoffset: CIRCUMFERENCE },
                    animate: {
                      strokeDashoffset:
                        CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE,
                    },
                    transition: {
                      duration: 0.8,
                      ease: [0.16, 1, 0.3, 1],
                    },
                  })}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-mono text-2xl font-bold ${getTextColor(percentage)}`}>
              {percentage.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Budget details */}
        <div className="text-center mt-2">
          <p className="text-sm text-foreground font-mono">
            {formatCurrency(spent)}{" "}
            <span className="text-text-tertiary text-xs">
              de {formatCurrency(budget!)}
            </span>
          </p>
          <button
            onClick={handleStartEdit}
            className="text-[10px] text-text-tertiary hover:text-accent transition-colors mt-1"
          >
            Editar presupuesto
          </button>
        </div>
      </div>
    </Card>
  )
}
