// ══════════════════════════════════════
// Cronos — Agregación cross-módulo
// Proyecta eventos "virtuales" desde Gastos, Proyectos y Mercados.
// Funciones isomórficas (aceptan client server o browser).
// ══════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { CronosItem, TimeboxTask } from '@/types/agenda'
import { SOURCE_COLORS } from '@/types/agenda'
import { startOfDay } from '@/lib/agenda/range'

type Client = SupabaseClient<Database>

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

function formatAmount(amount: number, currency: string): string {
  if (currency === 'EUR') return eur.format(amount)
  return `${amount} ${currency}`
}

const localMidnight = (dateStr: string) => new Date(`${dateStr}T00:00:00`)
const dateOnly = (d: Date) => d.toISOString().slice(0, 10)

// ─── Gastos: renovaciones de suscripciones ───

interface RenewalSub {
  id: string
  name: string
  amount: number
  currency: string
  color: string | null
  cycle: string
  billing_day: number
  is_active: boolean
  started_at: string | null
}

/** Genera las fechas de cobro de una suscripción dentro de [start, end]. */
function renewalDatesInRange(sub: RenewalSub, start: Date, end: Date): Date[] {
  if (!sub.is_active) return []
  const out: Date[] = []
  const periodMonths =
    sub.cycle === 'annual' ? 12 : sub.cycle === 'semiannual' ? 6 : sub.cycle === 'quarterly' ? 3 : 1
  const anchor = sub.started_at ? new Date(sub.started_at) : null
  const dayStart = startOfDay(start)

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1)

  while (cursor <= lastMonth) {
    const y = cursor.getFullYear()
    const mo = cursor.getMonth()
    const daysInMonth = new Date(y, mo + 1, 0).getDate()
    let dayNum: number | null = null

    if (periodMonths === 1) {
      dayNum = Math.min(sub.billing_day, daysInMonth)
    } else if (anchor) {
      const monthDiff = mo - anchor.getMonth() + 12 * (y - anchor.getFullYear())
      if (monthDiff >= 0 && monthDiff % periodMonths === 0) {
        dayNum = Math.min(anchor.getDate(), daysInMonth)
      }
    }

    if (dayNum !== null) {
      const d = new Date(y, mo, dayNum)
      if (d >= dayStart && d <= end) out.push(d)
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return out
}

export async function getGastoItems(
  client: Client,
  userId: string,
  start: string,
  end: string
): Promise<CronosItem[]> {
  const { data, error } = await client
    .from('subscriptions')
    .select('id, name, amount, currency, color, cycle, billing_day, is_active, started_at')
    .eq('user_id', userId)
    .eq('is_active', true)
  if (error || !data) return []

  const rangeStart = new Date(start)
  const rangeEnd = new Date(end)
  const items: CronosItem[] = []

  for (const sub of data as RenewalSub[]) {
    for (const d of renewalDatesInRange(sub, rangeStart, rangeEnd)) {
      const iso = d.toISOString()
      items.push({
        id: `gasto:${sub.id}:${dateOnly(d)}`,
        sourceId: sub.id,
        source: 'gasto',
        title: `${sub.name} · ${formatAmount(sub.amount, sub.currency)}`,
        start: iso,
        end: iso,
        allDay: true,
        color: sub.color || SOURCE_COLORS.gasto,
        href: '/gastos',
      })
    }
  }
  return items
}

// ─── Proyectos: deadlines de tareas y de proyecto ───

export async function getProyectoItems(
  client: Client,
  userId: string,
  start: string,
  end: string
): Promise<CronosItem[]> {
  const startDate = start.slice(0, 10)
  const endDate = end.slice(0, 10)

  const { data: projects, error: pErr } = await client
    .from('projects')
    .select('id, name, target_date')
    .eq('user_id', userId)
  if (pErr || !projects) return []

  const items: CronosItem[] = []

  // Deadline del propio proyecto (target_date)
  for (const p of projects) {
    if (p.target_date && p.target_date >= startDate && p.target_date <= endDate) {
      const iso = localMidnight(p.target_date).toISOString()
      items.push({
        id: `project:${p.id}`,
        sourceId: p.id,
        source: 'proyecto',
        title: `🎯 ${p.name}`,
        start: iso,
        end: iso,
        allDay: true,
        color: SOURCE_COLORS.proyecto,
        href: '/proyectos',
      })
    }
  }

  // Tareas con due_date (vía fases del usuario; RLS protege el acceso)
  const projectIds = projects.map((p) => p.id)
  if (projectIds.length === 0) return items

  const { data: phases } = await client
    .from('project_phases')
    .select('id, project_id')
    .in('project_id', projectIds)
  const phaseIds = (phases ?? []).map((ph) => ph.id)
  const projectName = new Map(projects.map((p) => [p.id, p.name]))
  const phaseProject = new Map((phases ?? []).map((ph) => [ph.id, ph.project_id]))

  if (phaseIds.length > 0) {
    const { data: tasks } = await client
      .from('phase_tasks')
      .select('id, phase_id, text, due_date, done, color')
      .in('phase_id', phaseIds)
      .not('due_date', 'is', null)
      .gte('due_date', startDate)
      .lte('due_date', endDate)

    for (const t of tasks ?? []) {
      if (!t.due_date) continue
      const iso = localMidnight(t.due_date).toISOString()
      const pid = phaseProject.get(t.phase_id)
      items.push({
        id: `task:${t.id}`,
        sourceId: t.id,
        source: 'proyecto',
        title: t.text,
        description: pid ? projectName.get(pid) ?? null : null,
        start: iso,
        end: iso,
        allDay: true,
        color: t.color || SOURCE_COLORS.proyecto,
        completed: t.done ?? false,
        href: '/proyectos',
      })
    }
  }

  return items
}

// ─── Mercados: alertas ───

export async function getMercadoItems(
  client: Client,
  userId: string,
  start: string,
  end: string
): Promise<CronosItem[]> {
  const { data, error } = await client
    .from('market_alerts')
    .select('id, title, message, triggered_at, severity')
    .eq('user_id', userId)
    .gte('triggered_at', start)
    .lte('triggered_at', end)
  if (error || !data) return []

  return data
    .filter((a) => a.triggered_at)
    .map((a) => {
      const iso = a.triggered_at as string
      const endIso = new Date(new Date(iso).getTime() + 30 * 60000).toISOString()
      return {
        id: `alert:${a.id}`,
        sourceId: a.id,
        source: 'mercado' as const,
        title: a.title,
        description: a.message,
        start: iso,
        end: endIso,
        allDay: false,
        color: SOURCE_COLORS.mercado,
        href: '/mercados',
      }
    })
}

// ─── Proyectos: tareas sin programar (timeboxing) ───

export async function getUnscheduledTasks(
  client: Client,
  userId: string
): Promise<TimeboxTask[]> {
  const { data: projects } = await client
    .from('projects')
    .select('id, name')
    .eq('user_id', userId)
  if (!projects?.length) return []

  const { data: phases } = await client
    .from('project_phases')
    .select('id, project_id')
    .in(
      'project_id',
      projects.map((p) => p.id)
    )
  if (!phases?.length) return []

  const projectName = new Map(projects.map((p) => [p.id, p.name]))
  const phaseProject = new Map(phases.map((ph) => [ph.id, ph.project_id]))

  const { data: tasks } = await client
    .from('phase_tasks')
    .select('id, phase_id, text, done, color')
    .in(
      'phase_id',
      phases.map((ph) => ph.id)
    )
    .is('due_date', null)
    .eq('done', false)
    .limit(50)

  return (tasks ?? []).map((t) => {
    const pid = phaseProject.get(t.phase_id)
    return {
      id: t.id,
      text: t.text,
      projectName: pid ? projectName.get(pid) ?? null : null,
      color: t.color,
    }
  })
}

/** Orquesta las tres fuentes en paralelo. */
export async function getAggregatedItems(
  client: Client,
  userId: string,
  start: string,
  end: string
): Promise<CronosItem[]> {
  const [gastos, proyectos, mercados] = await Promise.all([
    getGastoItems(client, userId, start, end),
    getProyectoItems(client, userId, start, end),
    getMercadoItems(client, userId, start, end),
  ])
  return [...gastos, ...proyectos, ...mercados]
}
