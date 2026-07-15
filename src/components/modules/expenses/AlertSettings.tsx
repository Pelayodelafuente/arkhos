"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Bell } from "lucide-react"
import { Modal, Button, Input } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"

interface AlertSettingsProps {
  open: boolean
  onClose: () => void
  userId: string
}

export function AlertSettings({ open, onClose, userId }: AlertSettingsProps) {
  const settings = useExpensesStore((s) => s.settings)
  const updateSettings = useExpensesStore((s) => s.updateSettings)

  const [daysBefore, setDaysBefore] = useState(() => String(settings?.alert_days_before ?? 1))
  const [renewalDays, setRenewalDays] = useState(() => String(settings?.alert_renewal_days ?? 30))
  const [enabled, setEnabled] = useState(() => settings?.alert_enabled ?? true)
  const [saving, setSaving] = useState(false)
  const [prevSync, setPrevSync] = useState({ settings, open })

  if (settings !== prevSync.settings || open !== prevSync.open) {
    setPrevSync({ settings, open })
    if (settings) {
      setDaysBefore(String(settings.alert_days_before ?? 1))
      setRenewalDays(String(settings.alert_renewal_days ?? 30))
      setEnabled(settings.alert_enabled ?? true)
    }
  }

  const handleSave = async () => {
    const days = Math.max(1, Math.min(30, parseInt(daysBefore, 10) || 1))
    const renewal = Math.max(7, Math.min(90, parseInt(renewalDays, 10) || 30))

    setSaving(true)
    try {
      await updateSettings(userId, {
        alert_days_before: days,
        alert_renewal_days: renewal,
        alert_enabled: enabled,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Configurar alertas" className="max-w-sm">
      <div className="space-y-5">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={16} strokeWidth={1.75} className="text-text-secondary" />
            <span className="text-sm font-medium text-foreground">Activar alertas</span>
          </div>
          <motion.button
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              enabled ? "bg-accent" : "bg-border"
            }`}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow"
              animate={{ x: enabled ? 18 : 3 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>

        {/* Days before billing */}
        <Input
          label="Avisar X días antes del cobro"
          type="number"
          min={1}
          max={30}
          value={daysBefore}
          onChange={(e) => setDaysBefore(e.target.value)}
          disabled={!enabled}
        />

        {/* Renewal alert days */}
        <Input
          label="Avisar renovaciones con X días de antelación"
          type="number"
          min={7}
          max={90}
          value={renewalDays}
          onChange={(e) => setRenewalDays(e.target.value)}
          disabled={!enabled}
        />

        <p className="text-[11px] text-text-tertiary">
          Las alertas de cobro se muestran {daysBefore} día{parseInt(daysBefore, 10) !== 1 ? 's' : ''} antes.
          Las renovaciones anuales se avisan con {renewalDays} días de antelación.
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
