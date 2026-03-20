"use client"

import { Modal } from "@/components/ui"

interface ShortcutsModalProps {
  open: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { key: 'N', description: 'Nueva suscripción' },
  { key: 'S', description: 'Buscar' },
  { key: 'G', description: 'Gráficos' },
  { key: '←', description: 'Mes anterior' },
  { key: '→', description: 'Mes siguiente' },
  { key: 'Esc', description: 'Cerrar modal/popover' },
  { key: '?', description: 'Mostrar atajos' },
]

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Atajos de teclado" className="max-w-xs">
      <div className="space-y-2">
        {SHORTCUTS.map((s) => (
          <div key={s.key} className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">{s.description}</span>
            <kbd className="rounded-md border border-border bg-sand px-2 py-0.5 font-mono text-xs text-foreground">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  )
}
