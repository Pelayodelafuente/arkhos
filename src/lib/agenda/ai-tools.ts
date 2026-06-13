// ══════════════════════════════════════
// Cronos — Tools de IA (NL + auto-scheduling)
// Se ejecutan server-side con el cliente Supabase del usuario (RLS intacto).
// ══════════════════════════════════════

import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { AGENDA_COLOR, type AgendaEvent } from '@/types/agenda'
import { presetToRule, type RecurrencePreset } from '@/lib/agenda/recurrence'
import { expandEvents } from '@/lib/agenda/expand'

type Client = SupabaseClient<Database>

const EVENT_FIELDS =
  'id, user_id, title, description, start_time, end_time, is_all_day, location, color, recurrence_rule, reminders, source, linked_task_id, completed, metadata, created_at, updated_at' as const

export const AGENDA_TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_event',
    description:
      'Crea un evento en el calendario de Pelayo. Úsala cuando pida agendar/crear/bloquear algo. Las fechas/horas en formato ISO 8601 (ej. "2026-06-15T10:00:00"). Si el usuario no da hora y es un recordatorio de día completo, usa all_day:true.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título del evento' },
        start: { type: 'string', description: 'Inicio en ISO 8601' },
        end: { type: 'string', description: 'Fin en ISO 8601' },
        all_day: { type: 'boolean', description: 'true si es de día completo' },
        description: { type: 'string' },
        location: { type: 'string' },
        recurrence: {
          type: 'string',
          enum: ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly'],
          description: 'Repetición; "none" si no se repite',
        },
        reminder_minutes: {
          type: 'integer',
          description: 'Minutos antes para el recordatorio (por defecto 15)',
        },
        linked_task_id: {
          type: 'string',
          description: 'ID de una tarea de Proyectos a vincular (timeboxing), si aplica',
        },
      },
      required: ['title', 'start', 'end'],
    },
  },
  {
    name: 'find_free_slots',
    description:
      'Devuelve los huecos libres de un día concreto para una duración dada. Úsala para auto-programar tareas en el mejor momento antes de crear el evento.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Día en formato YYYY-MM-DD' },
        duration_minutes: { type: 'integer', description: 'Duración necesaria en minutos' },
        earliest_hour: { type: 'integer', description: 'Hora más temprana (0-23), por defecto 9' },
        latest_hour: { type: 'integer', description: 'Hora más tardía (0-23), por defecto 21' },
      },
      required: ['date', 'duration_minutes'],
    },
  },
  {
    name: 'list_events',
    description:
      'Lista los eventos existentes entre dos fechas ISO. Úsala para responder qué tiene Pelayo agendado o para evitar solapamientos.',
    input_schema: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'Inicio del rango en ISO 8601' },
        end: { type: 'string', description: 'Fin del rango en ISO 8601' },
      },
      required: ['start', 'end'],
    },
  },
  {
    name: 'list_unscheduled_tasks',
    description:
      'Lista las tareas de Proyectos sin fecha asignada (id, texto, proyecto). Úsala para encontrar el id de una tarea y vincularla al crear un evento (timeboxing).',
    input_schema: { type: 'object', properties: {} },
  },
]

interface ToolExecution {
  content: string
  isError?: boolean
  mutated?: boolean
}

// ─── Conversión hora local (naive) ↔ UTC ───
// El modelo trabaja siempre en hora local naive ("YYYY-MM-DDTHH:mm:ss").
// tzOffsetMin = minutos de la zona del usuario (Madrid verano = 120).

/** Date "reloj-local": sus métodos UTC leen la hora de pared local. */
function pseudo(naive: string): Date {
  const s = naive.length <= 10 ? `${naive}T00:00:00` : naive.slice(0, 19)
  return new Date(`${s}Z`)
}

/** ISO UTC real → Date "reloj-local" (instante desplazado por el offset). */
function utcToLocalClock(iso: string, offsetMin: number): Date {
  return new Date(new Date(iso).getTime() + offsetMin * 60000)
}

/** Naive local → ISO UTC real (para guardar en DB). */
function localToUtcIso(naive: string, offsetMin: number): string {
  return new Date(pseudo(naive).getTime() - offsetMin * 60000).toISOString()
}

/** ISO UTC de DB → naive local (para mostrar al modelo). */
function utcToLocalNaive(iso: string, offsetMin: number): string {
  return new Date(new Date(iso).getTime() + offsetMin * 60000).toISOString().slice(0, 19)
}

export async function executeAgendaTool(
  client: Client,
  userId: string,
  name: string,
  input: unknown,
  tzOffsetMin = 0
): Promise<ToolExecution> {
  try {
    switch (name) {
      case 'create_event': {
        const i = input as {
          title?: string
          start?: string
          end?: string
          all_day?: boolean
          description?: string
          location?: string
          recurrence?: RecurrencePreset
          reminder_minutes?: number
          linked_task_id?: string
        }
        if (!i.title || !i.start || !i.end) {
          return { content: 'Faltan title, start o end', isError: true }
        }
        const { data, error } = await client
          .from('agenda_events')
          .insert({
            user_id: userId,
            title: i.title,
            description: i.description ?? null,
            start_time: localToUtcIso(i.start, tzOffsetMin),
            end_time: localToUtcIso(i.end, tzOffsetMin),
            is_all_day: i.all_day ?? false,
            location: i.location ?? null,
            color: AGENDA_COLOR,
            recurrence_rule: presetToRule(i.recurrence ?? 'none'),
            reminders: [i.reminder_minutes ?? 15],
            linked_task_id: i.linked_task_id ?? null,
          })
          .select('id, title, start_time')
          .single()
        if (error) return { content: `Error creando evento: ${error.message}`, isError: true }
        return {
          content: JSON.stringify({ created: true, id: data.id, title: data.title }),
          mutated: true,
        }
      }

      case 'find_free_slots': {
        const i = input as {
          date?: string
          duration_minutes?: number
          earliest_hour?: number
          latest_hour?: number
        }
        if (!i.date || !i.duration_minutes) {
          return { content: 'Faltan date o duration_minutes', isError: true }
        }
        const earliest = i.earliest_hour ?? 9
        const latest = i.latest_hour ?? 21
        // Límites del día local convertidos a UTC para la consulta
        const queryStart = localToUtcIso(`${i.date}T00:00:00`, tzOffsetMin)
        const queryEnd = localToUtcIso(`${i.date}T23:59:59`, tzOffsetMin)

        const { data: events } = await client
          .from('agenda_events')
          .select(EVENT_FIELDS)
          .eq('user_id', userId)
          .or(`and(start_time.lte.${queryEnd},end_time.gte.${queryStart}),recurrence_rule.not.is.null`)

        const items = expandEvents(
          (events ?? []) as unknown as AgendaEvent[],
          new Date(queryStart),
          new Date(queryEnd)
        ).filter((it) => !it.allDay)

        // Todo en "reloj-local" para razonar en horas de pared
        const windowStart = pseudo(`${i.date}T${String(earliest).padStart(2, '0')}:00:00`)
        const windowEnd = pseudo(`${i.date}T${String(latest).padStart(2, '0')}:00:00`)
        const busy = items
          .map((it) => ({
            start: utcToLocalClock(it.start, tzOffsetMin),
            end: utcToLocalClock(it.end, tzOffsetMin),
          }))
          .sort((a, b) => a.start.getTime() - b.start.getTime())

        const free: { start: string; end: string }[] = []
        let cursor = windowStart
        const durMs = i.duration_minutes * 60000
        for (const b of busy) {
          if (b.start.getTime() - cursor.getTime() >= durMs) {
            free.push({
              start: cursor.toISOString().slice(0, 19),
              end: b.start.toISOString().slice(0, 19),
            })
          }
          if (b.end > cursor) cursor = b.end
        }
        if (windowEnd.getTime() - cursor.getTime() >= durMs) {
          free.push({
            start: cursor.toISOString().slice(0, 19),
            end: windowEnd.toISOString().slice(0, 19),
          })
        }
        return { content: JSON.stringify({ date: i.date, free_slots: free.slice(0, 6) }) }
      }

      case 'list_events': {
        const i = input as { start?: string; end?: string }
        if (!i.start || !i.end) return { content: 'Faltan start o end', isError: true }
        const { data, error } = await client
          .from('agenda_events')
          .select('title, start_time, end_time, is_all_day')
          .eq('user_id', userId)
          .gte('start_time', localToUtcIso(i.start, tzOffsetMin))
          .lte('start_time', localToUtcIso(i.end, tzOffsetMin))
          .order('start_time', { ascending: true })
          .limit(50)
        if (error) return { content: `Error de consulta: ${error.message}`, isError: true }
        return {
          content: JSON.stringify(
            (data ?? []).map((e) => ({
              title: e.title,
              start: utcToLocalNaive(e.start_time, tzOffsetMin),
              end: utcToLocalNaive(e.end_time, tzOffsetMin),
              all_day: e.is_all_day,
            }))
          ),
        }
      }

      case 'list_unscheduled_tasks': {
        const { data: projects } = await client
          .from('projects')
          .select('id, name')
          .eq('user_id', userId)
        if (!projects?.length) return { content: '[]' }
        const { data: phases } = await client
          .from('project_phases')
          .select('id, project_id')
          .in(
            'project_id',
            projects.map((p) => p.id)
          )
        if (!phases?.length) return { content: '[]' }
        const projectName = new Map(projects.map((p) => [p.id, p.name]))
        const phaseProject = new Map(phases.map((ph) => [ph.id, ph.project_id]))
        const { data: tasks } = await client
          .from('phase_tasks')
          .select('id, phase_id, text')
          .in(
            'phase_id',
            phases.map((ph) => ph.id)
          )
          .is('due_date', null)
          .eq('done', false)
          .limit(30)
        return {
          content: JSON.stringify(
            (tasks ?? []).map((t) => {
              const pid = phaseProject.get(t.phase_id)
              return { id: t.id, text: t.text, project: pid ? projectName.get(pid) ?? null : null }
            })
          ),
        }
      }

      default:
        return { content: `Tool desconocida: ${name}`, isError: true }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error desconocido'
    return { content: `Error ejecutando ${name}: ${msg}`, isError: true }
  }
}
