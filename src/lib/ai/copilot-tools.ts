// ══════════════════════════════════════
// Arkhos — Tools del AI Copiloto (F4.2)
// Se ejecutan server-side con el cliente Supabase del usuario autenticado,
// de modo que RLS limita cada consulta a sus propios datos.
// ══════════════════════════════════════

import type Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

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
]

interface ToolExecution {
  content: string
  isError?: boolean
}

export async function executeCopilotTool(
  client: Client,
  userId: string,
  name: string,
  input: unknown
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

      default:
        return { content: `Tool desconocida: ${name}`, isError: true }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error desconocido'
    return { content: `Error ejecutando ${name}: ${msg}`, isError: true }
  }
}
