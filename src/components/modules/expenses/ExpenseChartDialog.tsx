"use client"

import { useState } from "react"
import { PieChart as PieChartIcon } from "lucide-react"
import dynamic from "next/dynamic"
import { Button, Modal } from "@/components/ui"

const LazyCharts = dynamic(() => import("./charts/ChartContent"), { ssr: false })

export function ExpenseChartDialog() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="border border-border"
      >
        <PieChartIcon size={16} strokeWidth={1.75} />
        <span className="hidden sm:inline">Gráfico</span>
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Análisis de gastos"
        className="max-w-2xl"
      >
        {open && <LazyCharts />}
      </Modal>
    </>
  )
}
