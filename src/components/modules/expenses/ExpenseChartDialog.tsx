"use client"

import { useState, useMemo } from "react"
import { PieChart as PieChartIcon } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Button, Modal } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import { findServiceById } from "@/data/subscriptionServices"
import { useIsMobile } from "@/hooks/useIsMobile"

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
})

export function ExpenseChartDialog() {
  const [open, setOpen] = useState(false)
  const subscriptions = useExpensesStore((s) => s.subscriptions)
  const isMobile = useIsMobile()

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((s) => s.is_active),
    [subscriptions]
  )

  const chartData = useMemo(() => {
    return activeSubscriptions.map((sub) => ({
      name: sub.name,
      value: sub.cycle === "monthly" ? sub.amount : sub.amount / 12,
      color: sub.color,
      icon: sub.icon,
      fullAmount: sub.amount,
      cycle: sub.cycle,
    }))
  }, [activeSubscriptions])

  const total = useMemo(
    () => chartData.reduce((acc, d) => acc + d.value, 0),
    [chartData]
  )

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="border border-border"
      >
        <PieChartIcon size={16} strokeWidth={1.75} />
        <span className="hidden sm:inline">Grafico</span>
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Distribucion del gasto"
        className={isMobile ? "max-w-[90vw]" : "max-w-lg"}
      >
        {chartData.length === 0 ? (
          <p className="text-center text-sm text-text-tertiary py-8">
            No hay suscripciones activas
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Pie Chart */}
            <div className="relative mx-auto h-[200px] w-[200px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center total */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-[10px] text-text-tertiary">
                  TOTAL/MES
                </span>
                <span className="font-heading text-lg text-foreground">
                  {currencyFormatter.format(total)}
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 max-h-[240px] overflow-y-auto space-y-2">
              {chartData.map((entry) => {
                const service = findServiceById(entry.icon)
                const IconComponent = service?.icon
                const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0"

                return (
                  <div
                    key={entry.name}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5"
                  >
                    {/* Color dot / icon */}
                    <div
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${entry.color}1A` }}
                    >
                      {IconComponent ? (
                        <IconComponent width={14} height={14} />
                      ) : (
                        <span
                          className="text-[10px] font-semibold"
                          style={{ color: entry.color }}
                        >
                          {entry.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <span className="flex-1 text-[13px] text-foreground truncate">
                      {entry.name}
                    </span>

                    {/* Amount + % */}
                    <div className="text-right flex-shrink-0">
                      <span className="font-mono text-[13px] text-foreground">
                        {currencyFormatter.format(entry.value)}
                      </span>
                      <span className="ml-1 font-mono text-[10px] text-text-tertiary">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
