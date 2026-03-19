"use client"

export function ExpenseLegend() {
  const today = new Date().getDate()

  return (
    <div className="flex items-center justify-center gap-4 py-3">
      {/* Monthly */}
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#C87A8A" }} />
        <span className="text-[12px] text-text-tertiary">Mensual</span>
      </div>

      {/* Annual */}
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#7AACCC" }} />
        <span className="text-[12px] text-text-tertiary">Anual</span>
      </div>

      {/* Today */}
      <div className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded border border-border bg-surface-2">
          <span className="font-mono text-[9px] font-extrabold text-accent">
            {today}
          </span>
        </span>
        <span className="text-[12px] text-text-tertiary">Hoy</span>
      </div>
    </div>
  )
}
