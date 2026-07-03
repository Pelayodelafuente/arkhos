// ══════════════════════════════════════
// Arkhos — Tools del AI Copiloto (F4.2 + acciones cross-módulo)
// Se ejecutan server-side con el cliente Supabase del usuario autenticado,
// de modo que RLS limita cada consulta/mutación a sus propios datos.
// ══════════════════════════════════════

import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { executeAgendaTool } from '@/lib/agenda/ai-tools'

type Client = SupabaseClient<Database>

export const COPILOT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_monthly_spending',
    description:
      'Devuelve los pagos de suscripciones registrados en un mes concreto (total en EUR y desglose por pago). Úsala para preguntas tipo "¿cuánto gasté en mayo?".',
    input_schema: {
      type: 'object',
      properties: {
        year: { type: 'integer', description: 'Año, p. ej. 2026' },
        month: { type: 'integer', description: 'Mes 1-12' },
      },
      required: ['year', 'month'],
    },
  },
  {
    name: 'get_subscriptions',
    description:
      'Lista las suscripciones activas del usuario: nombre, importe, ciclo de facturación y día de cobro.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_patrimonio',
    description:
      'Devuelve el snapshot más reciente del patrimonio: valor total, total invertido y fecha del snapshot.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_projects_status',
    description:
      'Lista los proyectos no archivados con su estado y progreso de tareas (hechas/total).',
    input_schema: { type: 'object', properties: {} },
  },
  // ── Acciones (escritura) ──────────────────────────────────────────────────
  {
    name: 'create_event',
    description:
      'Crea un evento en el calendario Cronos de Pelayo. Úsala cuando pida agendar/recordar algo con fecha. Fechas en hora local naive "YYYY-MM-DDTHH:mm:ss". Duración por defecto 1 hora.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título del evento' },
        start: { type: 'string', description: 'Inicio en ISO local naive' },
        end: { type: 'string', description: 'Fin en ISO local naive' },
        all_day: { type: 'boolean', description: 'true si es de día completo' },
        description: { type: 'string' },
      },
      required: ['title', 'start', 'end'],
    },
  },
  {
    name: 'create_note',
    description:
      'Crea una nota rápida en el módulo Notas. Úsala cuando Pelayo pida apuntar/anotar/guardar una idea o texto sin fecha.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título corto de la nota' },
        content: { type: 'string', description: 'Contenido de la nota (texto plano)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_subscription',
    description:
      'Registra una suscripción nueva en Gastos. Úsala cuando Pelayo diga que se ha suscrito/apuntado a un servicio con coste recurrente.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre del servicio, p. ej. "Netflix"' },
        amount: { type: 'number', description: 'Importe en EUR por ciclo' },
        cycle: {
          type: 'string',
          enum: ['monthly', 'quarterly', 'semiannual', 'annual'],
          description: 'Ciclo de facturación',
        },
        billing_day: { type: 'integer', description: 'Día del mes de cobro (1-31)' },
        category_name: {
          type: 'string',
          description: 'Nombre de una categoría existente de Gastos (opcional)',
        },
      },
      required: ['name', 'amount', 'cycle', 'billing_day'],
    },
  },
  {
    name: 'list_pending_tasks',
    description:
      'Lista las tareas pendientes de Proyectos con su id, texto y proyecto. Úsala antes de complete_task para localizar la tarea correcta.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'complete_task',
    description:
      'Marca como hecha una tarea de Proyectos por su id (obtenido con list_pending_tasks).',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'ID de la tarea a completar' },
      },
      required: ['task_id'],
    },
  },
]

interface ToolExecution {
  content: string
  isError?: boolean
  mutated?: boolean
}

export async function executeCopilotTool(
  client: Client,
  userId: string,
  name: string,
  input: unknown,
  tzOffsetMin = 0
): Promise<ToolExecution> {
  try {
    switch (name) {
      case 'get_monthly_spending': {
        const { year, month } = input as { year: number; month: number }
        if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
          return { content: 'Parámetros inválidos: year debe ser un año y month 1-12', isError: true }
        }
        const from = `${year}-${String(month).padStart(2, '0')}-01`
        const toDate = new Date(year, month, 1)
        const to = toDate.toISOString().split('T')[0]
        const { data, error } = await client
          .from('subscription_payments')
          .select('amount, paid_at, subscription_id')
          .eq('user_id', userId)
          .gte('paid_at', from)
          .lt('paid_at', to)
        if (error) return { content: `Error de consulta: ${error.message}`, isError: true }
        const total = (data ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
        return {
          content: JSON.stringify({
            year,
            month,
            total_eur: parseFloat(total.toFixed(2)),
            payments_count: data?.length ?? 0,
          }),
        }
      }

      case 'get_subscriptions': {
        const { data, error } = await client
          .from('subscriptions')
          .select('name, amount, cycle, billing_day, is_active')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('amount', { ascending: false })
          .limit(50)
        if (error) return { content: `Error de consulta: ${error.message}`, isError: true }
        return {
          content: JSON.stringify(
            (data ?? []).map((s) => ({
              name: s.name,
              amount_eur: s.amount,
              cycle: s.cycle,
              billing_day: s.billing_day,
            }))
          ),
        }
      }

      case 'get_patrimonio': {
        const { data, error } = await client
          .from('portfolio_snapshots')
          .select('snapshot_date, total_value, total_invested')
          .eq('user_id', userId)
          .order('snapshot_date', { ascending: false })
          .limit(10)
        if (error) return { content: `Error de consulta: ${error.message}`, isError: true }
        // Un snapshot por plataforma y fecha → agregamos la fecha más reciente
        const latestDate = data?.[0]?.snapshot_date
        const latest = (data ?? []).filter((s) => s.snapshot_date === latestDate)
        const totalValue = latest.reduce((s, r) => s + (r.total_value ?? 0), 0)
        const totalInvested = latest.reduce((s, r) => s + (r.total_invested ?? 0), 0)
        return {
          content: JSON.stringify({
            snapshot_date: latestDate ?? null,
            total_value_eur: parseFloat(totalValue.toFixed(2)),
            total_invested_eur: parseFloat(totalInvested.toFixed(2)),
          }),
        }
      }

      case 'get_projects_status': {
        const { data, error } = await client
          .from('projects')
          .select('name, status, project_phases(phase_tasks(done))')
          .eq('user_id', userId)
          .neq('status', 'archived')
          .limit(30)
        if (error) return { content: `Error de consulta: ${error.message}`, isError: true }
        return {
          content: JSON.stringify(
            (data ?? []).map((p) => {
              const tasks = (p.project_phases ?? []).flatMap((ph) => ph.phase_tasks ?? [])
              return {
                name: p.name,
                status: p.status,
                tasks_done: tasks.filter((t) => t.done).length,
                tasks_total: tasks.length,
              }
            })
          ),
        }
      }

      // ── Acciones ──────────────────────────────────────────────────────────
      case 'create_event': {
        // Reutiliza el executor de Cronos (validación + conversión tz + insert con RLS)
        return executeAgendaTool(client, userId, 'create_event', input, tzOffsetMin)
      }

      case 'create_note': {
        const i = input as { title?: string; content?: string }
        if (!i.title?.trim()) return { content: 'Falta title', isError: true }
        const content = (i.content ?? '').trim()
        const html = content ? `<p>${content.replace(/\n+/g, '</p><p>')}</p>` : ''
        const wordCount = content.split(/\s+/).filter(Boolean).length
        const { data, error } = await client
          .from('notes')
          .insert({
            user_id: userId,
            title: i.title.trim().slice(0, 200),
            content: html,
            color: 'default',
            icon: 'FileText',
            tags: [],
            word_count: wordCount,
            status: 'none',
          })
          .select('id, title')
          .single()
        if (error) return { content: `Error creando nota: ${error.message}`, isError: true }
        return {
          content: JSON.stringify({ created: true, id: data.id, title: data.title }),
          mutated: true,
        }
      }

      case 'create_subscription': {
        const i = input as {
          name?: string
          amount?: number
          cycle?: string
          billing_day?: number
          category_name?: string
        }
        const validCycles = ['monthly', 'quarterly', 'semiannual', 'annual']
        if (
          !i.name?.trim() ||
          typeof i.amount !== 'number' ||
          i.amount <= 0 ||
          !i.cycle ||
          !validCycles.includes(i.cycle) ||
          !Number.isInteger(i.billing_day) ||
          (i.billing_day as number) < 1 ||
          (i.billing_day as number) > 31
        ) {
          return { content: 'Parámetros inválidos (name, amount>0, cycle, billing_day 1-31)', isError: true }
        }

        let categoryId: string | null = null
        let categoryColor = '#3079B0'
        if (i.category_name?.trim()) {
          const { data: cat } = await client
            .from('expense_categories')
            .select('id, color')
            .eq('user_id', userId)
            .ilike('name', `%${i.category_name.trim()}%`)
            .limit(1)
            .maybeSingle()
          if (cat) {
            categoryId = cat.id
            categoryColor = cat.color
          }
        }

        const { data, error } = await client
          .from('subscriptions')
          .insert({
            user_id: userId,
            category_id: categoryId,
            name: i.name.trim(),
            icon: 'zap',
            color: categoryColor,
            amount: i.amount,
            currency: 'EUR',
            cycle: i.cycle,
            billing_day: i.billing_day as number,
            is_active: true,
            status: 'active',
            started_at: new Date().toISOString().slice(0, 10),
            tags: [],
          })
          .select('id, name, amount, cycle')
          .single()
        if (error) return { content: `Error creando suscripción: ${error.message}`, isError: true }
        return {
          content: JSON.stringify({
            created: true,
            id: data.id,
            name: data.name,
            amount_eur: data.amount,
            cycle: data.cycle,
            category_matched: categoryId !== null,
          }),
          mutated: true,
        }
      }

      case 'list_pending_tasks': {
        // Mismo recorrido projects → phases → tasks que Cronos, pero incluye
        // también tareas con due_date (todas las pendientes)
        const { data: projects } = await client
          .from('projects')
          .select('id, name')
          .eq('user_id', userId)
          .neq('status', 'archived')
        if (!projects?.length) return { content: '[]' }
        const { data: phases } = await client
          .from('project_phases')
          .select('id, project_id')
          .in('project_id', projects.map((p) => p.id))
        if (!phases?.length) return { content: '[]' }
        const projectName = new Map(projects.map((p) => [p.id, p.name]))
        const phaseProject = new Map(phases.map((ph) => [ph.id, ph.project_id]))
        const { data: tasks, error } = await client
          .from('phase_tasks')
          .select('id, phase_id, text')
          .in('phase_id', phases.map((ph) => ph.id))
          .eq('done', false)
          .limit(40)
        if (error) return { content: `Error de consulta: ${error.message}`, isError: true }
        return {
          content: JSON.stringify(
            (tasks ?? []).map((t) => {
              const pid = phaseProject.get(t.phase_id)
              return { id: t.id, text: t.text, project: pid ? projectName.get(pid) ?? null : null }
            })
          ),
        }
      }

      case 'complete_task': {
        const i = input as { task_id?: string }
        if (!i.task_id) return { content: 'Falta task_id', isError: true }
        // Verificar propiedad vía la cadena task → phase → project (RLS + user_id)
        const { data: task } = await client
          .from('phase_tasks')
          .select('id, text, phase_id')
          .eq('id', i.task_id)
          .maybeSingle()
        if (!task) return { content: 'Tarea no encontrada', isError: true }
        const { data: phase } = await client
          .from('project_phases')
          .select('project_id')
          .eq('id', task.phase_id)
          .maybeSingle()
        const { data: project } = phase
          ? await client
              .from('projects')
              .select('id')
              .eq('id', phase.project_id)
              .eq('user_id', userId)
              .maybeSingle()
          : { data: null }
        if (!project) return { content: 'Tarea no encontrada', isError: true }
        const { error } = await client
          .from('phase_tasks')
          .update({ done: true })
          .eq('id', i.task_id)
        if (error) return { content: `Error completando tarea: ${error.message}`, isError: true }
        return {
          content: JSON.stringify({ completed: true, id: task.id, text: task.text }),
          mutated: true,
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
