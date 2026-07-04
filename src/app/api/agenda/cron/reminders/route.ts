import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { configureWebPush, sendPush, type PushSub } from "@/lib/agenda/push"
import { expandEvents } from "@/lib/agenda/expand"
import type { AgendaEvent } from "@/types/agenda"

export const maxDuration = 60

// Digest diario (plan Hobby = crons diarios). Cada mañana envía un resumen push
// con los eventos de las próximas 24h. Los recordatorios por evento (15 min antes,
// etc.) los entrega el feed ICS vía VALARM → app de Proton en el móvil.
const HORIZON_H = 24

const timeFmt = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
})

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: "Cron no configurado" }, { status: 503 })
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: "Sin service role" }, { status: 503 })

  // ── Snapshot diario global de Patrimonio ──────────────────────────────
  // Piggyback en este cron (Vercel Hobby = máx. 2 crons): registra la fila
  // global (platform_id NULL) de portfolio_snapshots para todos los usuarios.
  // Nunca bloquea el digest de eventos.
  let snapshotUsers = 0
  try {
    const { data: snapCount, error: snapError } = await admin.rpc("run_daily_global_snapshots")
    if (!snapError) snapshotUsers = snapCount ?? 0
  } catch {
    /* el snapshot fallido no impide los recordatorios */
  }

  if (!configureWebPush()) {
    return NextResponse.json({ error: "VAPID no configurado" }, { status: 503 })
  }

  const now = new Date()
  const horizon = new Date(now.getTime() + HORIZON_H * 60 * 60 * 1000).toISOString()

  const { data: subs } = await admin
    .from("agenda_push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0, snapshotUsers })

  const byUser = new Map<string, PushSub[]>()
  for (const s of subs) {
    const arr = byUser.get(s.user_id) ?? []
    arr.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })
    byUser.set(s.user_id, arr)
  }

  let sent = 0

  const horizonDate = new Date(horizon)

  for (const [userId, userSubs] of byUser) {
    // Únicos que solapan la ventana + todos los recurrentes (la RRULE puede
    // caer dentro) — mismo criterio que getEvents; se expanden a ocurrencias.
    const { data: events } = await admin
      .from("agenda_events")
      .select(
        "id, user_id, title, description, start_time, end_time, is_all_day, location, color, recurrence_rule, reminders, source, linked_task_id, completed, metadata, created_at, updated_at"
      )
      .eq("user_id", userId)
      .or(
        `and(start_time.lte.${horizon},end_time.gte.${now.toISOString()}),recurrence_rule.not.is.null`
      )

    if (!events?.length) continue

    const items = expandEvents(events as unknown as AgendaEvent[], now, horizonDate)
      // Próximos (o de día completo aún en curso), sin los ya completados
      .filter((i) => !i.completed && (i.allDay ? new Date(i.end) >= now : new Date(i.start) >= now))

    if (items.length === 0) continue

    const lines = items.slice(0, 4).map((i) => {
      const when = i.allDay ? "Todo el día" : timeFmt.format(new Date(i.start))
      return `${when} ${i.title}`
    })
    const extra = items.length > 4 ? ` +${items.length - 4} más` : ""
    const body = lines.join(" · ") + extra
    const title = `Hoy: ${items.length} ${items.length === 1 ? "evento" : "eventos"}`

    for (const sub of userSubs) {
      const res = await sendPush(sub, { title, body, url: "/agenda" })
      if (res === "ok") sent++
      else if (res === "gone") {
        await admin.from("agenda_push_subscriptions").delete().eq("endpoint", sub.endpoint)
      }
    }
  }

  return NextResponse.json({ ok: true, sent, snapshotUsers, at: now.toISOString() })
}
