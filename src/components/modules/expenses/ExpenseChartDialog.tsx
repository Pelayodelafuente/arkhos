"use client"

import { useState, useEffect } from "react"
import { PieChart as PieChartIcon } from "lucide-react"
import dynamic from "next/dynamic"
import { Button, Modal } from "@/components/ui"

const LazyCharts = dynamic(() => import("./charts/ChartContent"), { ssr: false })

interface ExpenseChartDialogProps {
  externalOpen?: boolean
  onExternalClose?: () => void
}

export function ExpenseChartDialog({ externalOpen, onExternalClose }: ExpenseChartDialogProps) {
  const [open, setOpen] = useState(false)

  // Sync with external open state
  useEffect(() => {
    if (externalOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true)
    }
  }, [externalOpen])

  const handleClose = () => {
    setOpen(false)
    onExternalClose?.()
  }

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
        onClose={handleClose}
        title="Analisis de gastos"
        className="max-w-2xl"
      >
        {open && <LazyCharts />}
      </Modal>
    </>
  )
}
