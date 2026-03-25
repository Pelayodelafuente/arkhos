"use client"

interface ExpenseLegendProps {
  onGoToToday?: () => void
}

export function ExpenseLegend({ onGoToToday }: ExpenseLegendProps) {
  const today = new Date().getDate()

  return (
    <div className="flex items-center justify-center gap-4 py-3">
      {/* Monthly */}
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#5f1b29" }} />
        <span className="text-[12px] text-text-tertiary">Mensual</span>
      </div>

      {/* Annual */}
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#9a6a28" }} />
        <span className="text-[12px] text-text-tertiary">Anual</span>
      </div>

      {/* Today */}
      <button
        type="button"
        onClick={() => onGoToToday?.()}
        className="-mx-2 -my-1 flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-sand"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded border border-border bg-sand">
          <span className="font-mono text-[9px] font-extrabold text-accent">
            {today}
          </span>
        </span>
        <span className="text-[12px] text-text-tertiary">Hoy</span>
      </button>
    </div>
  )
}
