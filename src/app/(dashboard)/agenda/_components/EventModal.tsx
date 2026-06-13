"use client"

import { useEffect, useState } from "react"
import { Modal, Button, Input, Textarea, Select } from "@/components/ui"
import { useAgendaStore } from "@/stores/agenda-store"
import { AGENDA_COLOR, REMINDER_OPTIONS, type AgendaEvent, type EventFormData } from "@/types/agenda"
import { isoToDateInput, isoToLocalInput, localInputToIso } from "@/lib/agenda/dates"
import {
  RECURRENCE_OPTIONS,
  presetToRule,
  ruleToPreset,
  type RecurrencePreset,
} from "@/lib/agenda/recurrence"

const COLOR_SWATCHES = [
  AGENDA_COLOR, // ciruela (agenda)
  "#C4704A", // terracota
  "#3B78B0", // azul
  "#2E7D6B", // teal
  "#7260C4", // púrpura
  "#B07A3A", // oro
]

interface Props {
  open: boolean
  onClose: () => void
  userId: string
  /** Evento a editar; null/undefined = crear nuevo. */
  editing?: AgendaEvent | null
  /** Fecha inicial sugerida (ISO) al crear. */
  defaultDate?: string
  /** Título prefijado (timeboxing de una tarea). */
  prefillTitle?: string
  /** Tarea de Proyectos a enlazar (timeboxing). */
  prefillTaskId?: string | null
}

function buildInitial(
  editing: AgendaEvent | null | undefined,
  defaultDate?: string,
  prefillTitle?: string,
  prefillTaskId?: string | null
) {
  if (editing) {
    return {
      title: editing.title,
      description: editing.description ?? "",
      isAllDay: editing.is_all_day,
      start: editing.start_time,
      end: editing.end_time,
      location: editing.location ?? "",
      color: editing.color || AGENDA_COLOR,
      reminder: editing.reminders?.[0] ?? 15,
      recurrence: ruleToPreset(editing.recurrence_rule),
      linkedTaskId: editing.linked_task_id,
    }
  }
  const base = defaultDate ? new Date(defaultDate) : new Date()
  base.setMinutes(0, 0, 0)
  base.setHours(base.getHours() + 1)
  const startIso = base.toISOString()
  const endIso = new Date(base.getTime() + 60 * 60 * 1000).toISOString()
  return {
    title: prefillTitle ?? "",
    description: "",
    isAllDay: false,
    start: startIso,
    end: endIso,
    location: "",
    color: AGENDA_COLOR,
    reminder: 15,
    recurrence: "none" as RecurrencePreset,
    linkedTaskId: prefillTaskId ?? null,
  }
}

export function EventModal({
  open,
  onClose,
  userId,
  editing,
  defaultDate,
  prefillTitle,
  prefillTaskId,
}: Props) {
  const addEvent = useAgendaStore((s) => s.addEvent)
  const editEvent = useAgendaStore((s) => s.editEvent)
  const removeEvent = useAgendaStore((s) => s.removeEvent)

  const [form, setForm] = useState(() =>
    buildInitial(editing, defaultDate, prefillTitle, prefillTaskId)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resetear el formulario cada vez que se abre con un evento/fecha distinto
  useEffect(() => {
    if (open) {
      // Reset deliberado del formulario al abrir con nuevas props (sync intencional)
      /* eslint-disable react-hooks/set-state-in-effect */
      setForm(buildInitial(editing, defaultDate, prefillTitle, prefillTaskId))
      setError(null)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, editing, defaultDate, prefillTitle, prefillTaskId])

  const isEdit = Boolean(editing)

  async function handleSave() {
    if (!form.title.trim()) {
      setError("El título es obligatorio")
      return
    }
    if (new Date(form.end) < new Date(form.start)) {
      setError("El fin no puede ser anterior al inicio")
      return
    }
    setSaving(true)
    const payload: EventFormData = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_time: form.start,
      end_time: form.end,
      is_all_day: form.isAllDay,
      location: form.location.trim() || null,
      color: form.color,
      reminders: [form.reminder],
      recurrence_rule: presetToRule(form.recurrence),
      linked_task_id: form.linkedTaskId ?? null,
    }
    if (isEdit && editing) {
      await editEvent(editing.id, payload)
    } else {
      await addEvent(userId, payload)
    }
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!editing) return
    setSaving(true)
    await removeEvent(editing.id)
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar evento" : "Nuevo evento"}
      footer={
        <div className="flex items-center justify-between gap-3">
          {isEdit ? (
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={saving}>
              Eliminar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
              {isEdit ? "Guardar" : "Crear"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Título"
          value={form.title}
          autoFocus
          placeholder="Comida con Marta…"
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        {form.linkedTaskId && (
          <span
            className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: "color-mix(in srgb, var(--module-proyectos) 14%, transparent)",
              color: "var(--module-proyectos)",
            }}
          >
            ↳ Vinculado a tarea de Proyectos
          </span>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={form.isAllDay}
            onChange={(e) => setForm({ ...form, isAllDay: e.target.checked })}
            className="h-4 w-4 rounded border-border accent-[var(--module-agenda)]"
          />
          Todo el día
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Inicio"
            type={form.isAllDay ? "date" : "datetime-local"}
            value={form.isAllDay ? isoToDateInput(form.start) : isoToLocalInput(form.start)}
            onChange={(e) => setForm({ ...form, start: localInputToIso(e.target.value) })}
          />
          <Input
            label="Fin"
            type={form.isAllDay ? "date" : "datetime-local"}
            value={form.isAllDay ? isoToDateInput(form.end) : isoToLocalInput(form.end)}
            onChange={(e) => setForm({ ...form, end: localInputToIso(e.target.value) })}
          />
        </div>

        <Input
          label="Ubicación"
          value={form.location}
          placeholder="Opcional"
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />

        <Textarea
          label="Notas"
          rows={3}
          value={form.description}
          placeholder="Opcional"
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Recordatorio"
            value={String(form.reminder)}
            options={REMINDER_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            onChange={(e) => setForm({ ...form, reminder: Number(e.target.value) })}
          />
          <Select
            label="Repetición"
            value={form.recurrence}
            options={RECURRENCE_OPTIONS}
            onChange={(e) =>
              setForm({ ...form, recurrence: e.target.value as RecurrencePreset })
            }
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-secondary">Color</span>
          <div className="flex gap-2">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                aria-label={`Color ${c}`}
                className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  outline: form.color === c ? "2px solid var(--text-primary)" : "none",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs" style={{ color: "var(--error)" }}>
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
