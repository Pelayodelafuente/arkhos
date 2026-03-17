"use client"

import { Card, Badge } from "@/components/ui"
import { useExpensesStore, useExpenseSummary } from "@/stores/expenses-store"

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
})

const EYEBROW_TEXT: Record<string, string> = {
  all: "GASTO MENSUAL ESTIMADO",
  monthly: "SUSCRIPCIONES MENSUALES",
  annual: "SUSCRIPCIONES ANUALES (PRORRATEO)",
}

export function ExpenseSummaryCard() {
  const cycleFilter = useExpensesStore((s) => s.cycleFilter)
  const summary = useExpenseSummary()

  const displayTotal =
    cycleFilter === "monthly"
      ? summary.totalMonthly
      : cycleFilter === "annual"
        ? summary.totalAnnual / 12
        : summary.totalMonthlyEstimate

  return (
    <Card padding="lg">
      <div className="flex items-start justify-between">
        <div>
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-0.5 rounded-full bg-accent" />
            <span className="font-mono text-[10px] tracking-[0.08em] text-accent">
              {EYEBROW_TEXT[cycleFilter] ?? EYEBROW_TEXT.all}
            </span>
          </div>

          {/* Total */}
          <p className="font-heading text-[28px] text-foreground">
            {currencyFormatter.format(displayTotal)}
          </p>
        </div>

        {/* Badges */}
        <div className="flex flex-col gap-2 items-end">
          <Badge variant="blue">
            <span className="font-mono">{summary.countMonthly}</span>
            <span className="ml-1">mensuales</span>
          </Badge>
          <Badge variant="gold">
            <span className="font-mono">{summary.countAnnual}</span>
            <span className="ml-1">anuales</span>
          </Badge>
        </div>
      </div>
    </Card>
  )
}
