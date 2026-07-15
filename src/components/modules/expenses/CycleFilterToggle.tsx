"use client"

import { motion } from "framer-motion"
import { useExpensesStore } from "@/stores/expenses-store"
import type { CycleFilter } from "@/types/expenses"

const OPTIONS: { value: CycleFilter; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "monthly", label: "Mes" },
  { value: "annual", label: "Anual" },
]

export function CycleFilterToggle() {
  const cycleFilter = useExpensesStore((s) => s.cycleFilter)
  const setCycleFilter = useExpensesStore((s) => s.setCycleFilter)

  return (
    <div className="inline-flex items-center rounded-xl bg-sand p-1">
      {OPTIONS.map((opt) => {
        const isActive = cycleFilter === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => setCycleFilter(opt.value)}
            className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent ${
              isActive
                ? "text-card font-semibold"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="cycle-indicator"
                className="absolute inset-0 rounded-lg bg-foreground"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
