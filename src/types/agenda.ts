// ══════════════════════════════════════
// Cronos (Agenda) — Tipos del módulo
// Centro de mando temporal: eventos nativos + agregación cross-módulo
// ══════════════════════════════════════

/** Origen de un item del calendario. 'native' se almacena en agenda_events;
 *  el resto son "eventos virtuales" proyectados desde otros módulos. */
export type EventSource = 'native' | 'gasto' | 'proyecto' | 'mercado'

export type AgendaViewMode = 'month' | 'week' | 'day' | 'agenda'

/** Fila de agenda_events tal cual vive en la DB (timestamps como ISO string). */
export interface AgendaEvent {
  id: string
  user_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  is_all_day: boolean
  location: string | null
  color: string
  recurrence_rule: string | null
  reminders: number[]
  source: string
  linked_task_id: string | null
  completed: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** Datos del formulario de crear/editar evento nativo. */
export interface EventFormData {
  title: string
  description?: string | null
  start_time: string
  end_time: string
  is_all_day?: boolean
  location?: string | null
  color?: string
  recurrence_rule?: string | null
  reminders?: number[]
  linked_task_id?: string | null
}

/**
 * Item renderizable en el calendario. Unifica eventos nativos (incluidas las
 * ocurrencias expandidas de recurrencia) y los eventos virtuales de otros módulos.
 * Para ocurrencias recurrentes, `id` es `${sourceId}:${ocurrenciaISO}`.
 */
export interface CronosItem {
  id: string
  sourceId: string
  source: EventSource
  title: string
  start: string // ISO
  end: string // ISO
  allDay: boolean
  color: string
  description?: string | null
  location?: string | null
  completed?: boolean
  linkedTaskId?: string | null
  /** Deep-link al módulo de origen (gasto/proyecto/mercado). */
  href?: string
  recurring?: boolean
}

/** Tarea de Proyectos sin programar (candidata a timeboxing). */
export interface TimeboxTask {
  id: string
  text: string
  projectName: string | null
  color: string | null
}

/** Recordatorios disponibles (minutos antes del evento). */
export const REMINDER_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'En el momento' },
  { value: 5, label: '5 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 1440, label: '1 día antes' },
]

/** Color por defecto del módulo (var --module-agenda). */
export const AGENDA_COLOR = 'var(--module-agenda)'

/** Colores de los eventos virtuales por módulo de origen. */
export const SOURCE_COLORS: Record<EventSource, string> = {
  native: AGENDA_COLOR,
  gasto: 'var(--module-gastos)',
  proyecto: 'var(--accent-terracotta)',
  mercado: 'var(--module-mercados)',
}
