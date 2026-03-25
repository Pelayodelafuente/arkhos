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
    <div className="inline-flex items-center rounded-[20px] bg-sand p-[3px]">
      {OPTIONS.map((opt) => {
        const isActive = cycleFilter === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => setCycleFilter(opt.value)}
            className={`relative rounded-[17px] px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
              isActive
                ? "text-card font-semibold"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="cycle-indicator"
                className="absolute inset-0 rounded-[17px] bg-foreground"
                style={{ boxShadow: "0 1px 4px rgba(26,23,20,0.10)" }}
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
