// ══════════════════════════════════════
// Arkhos — Cronos (Agenda) Data Layer
// Eventos nativos. La agregación cross-módulo vive en aggregate.ts (Fase 3).
// ══════════════════════════════════════

import { createClient } from './client'
import type { AgendaEvent, CronosItem, EventFormData } from '@/types/agenda'
import { AGENDA_COLOR } from '@/types/agenda'

// ─── Constantes ──────────────────────

const EVENT_FIELDS =
  'id, user_id, title, description, start_time, end_time, is_all_day, location, color, recurrence_rule, reminders, source, linked_task_id, completed, metadata, created_at, updated_at' as const

// ─── Error helper ─────────────────────

class AgendaError extends Error {
  constructor(message: string, public readonly detail?: string) {
    super(message)
    this.name = 'AgendaError'
  }
}

// ─── Mapeo evento → item de calendario ─

/** Convierte un evento nativo en un item renderizable (sin expandir recurrencia). */
export function eventToItem(e: AgendaEvent): CronosItem {
  return {
    id: e.id,
    sourceId: e.id,
    source: 'native',
    title: e.title,
    start: e.start_time,
    end: e.end_time,
    allDay: e.is_all_day,
    color: e.color || AGENDA_COLOR,
    description: e.description,
    location: e.location,
    completed: e.completed,
    linkedTaskId: e.linked_task_id,
    recurring: Boolean(e.recurrence_rule),
  }
}

// ══════════════════════════════════════
// QUERIES
// ══════════════════════════════════════

/**
 * Eventos nativos que solapan el rango [rangeStart, rangeEnd] (ISO), más todos
 * los recurrentes (se expanden en cliente porque la regla puede caer en el rango).
 */
export async function getEvents(
  userId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<AgendaEvent[]> {
  const client = createClient()
  const { data, error } = await client
    .from('agenda_events')
    .select(EVENT_FIELDS)
    .eq('user_id', userId)
    .or(
      `and(start_time.lte.${rangeEnd},end_time.gte.${rangeStart}),recurrence_rule.not.is.null`
    )
    .order('start_time', { ascending: true })

  if (error) throw new AgendaError('Error fetching events', error.message)
  return (data ?? []) as AgendaEvent[]
}

export async function getEvent(id: string): Promise<AgendaEvent | null> {
  const client = createClient()
  const { data, error } = await client
    .from('agenda_events')
    .select(EVENT_FIELDS)
    .eq('id', id)
    .single()
  if (error) throw new AgendaError('Error fetching event', error.message)
  return (data as AgendaEvent) ?? null
}

export async function createEvent(userId: string, form: EventFormData): Promise<AgendaEvent> {
  const client = createClient()
  const { data, error } = await client
    .from('agenda_events')
    .insert({
      user_id: userId,
      title: form.title || 'Sin título',
      description: form.description ?? null,
      start_time: form.start_time,
      end_time: form.end_time,
      is_all_day: form.is_all_day ?? false,
      location: form.location ?? null,
      color: form.color ?? AGENDA_COLOR,
      recurrence_rule: form.recurrence_rule ?? null,
      reminders: form.reminders ?? [15],
      linked_task_id: form.linked_task_id ?? null,
    })
    .select(EVENT_FIELDS)
    .single()

  if (error) throw new AgendaError('Error creating event', error.message)
  return data as AgendaEvent
}

export async function updateEvent(
  id: string,
  form: Partial<EventFormData> & { completed?: boolean }
): Promise<AgendaEvent> {
  const client = createClient()
  // Validación redundante de user_id (defensa si RLS fuese bypaseado)
  const {
    data: { session },
  } = await client.auth.getSession()

  let query = client
    .from('agenda_events')
    .update({ ...form, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (session?.user?.id) query = query.eq('user_id', session.user.id)

  const { data, error } = await query.select(EVENT_FIELDS).single()
  if (error) throw new AgendaError('Error updating event', error.message)
  return data as AgendaEvent
}

export async function deleteEvent(id: string): Promise<void> {
  const client = createClient()
  const {
    data: { session },
  } = await client.auth.getSession()

  let query = client.from('agenda_events').delete().eq('id', id)
  if (session?.user?.id) query = query.eq('user_id', session.user.id)

  const { error } = await query
  if (error) throw new AgendaError('Error deleting event', error.message)
}
