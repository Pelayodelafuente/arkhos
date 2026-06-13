import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { configureWebPush, sendPush, type PushSub } from "@/lib/agenda/push"

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
  if (!configureWebPush()) {
    return NextResponse.json({ error: "VAPID no configurado" }, { status: 503 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: "Sin service role" }, { status: 503 })

  const now = new Date()
  const horizon = new Date(now.getTime() + HORIZON_H * 60 * 60 * 1000).toISOString()

  const { data: subs } = await admin
    .from("agenda_push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 })

  const byUser = new Map<string, PushSub[]>()
  for (const s of subs) {
    const arr = byUser.get(s.user_id) ?? []
    arr.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })
    byUser.set(s.user_id, arr)
  }

  let sent = 0

  for (const [userId, userSubs] of byUser) {
    const { data: events } = await admin
      .from("agenda_events")
      .select("title, start_time, is_all_day")
      .eq("user_id", userId)
      .is("recurrence_rule", null)
      .gte("start_time", now.toISOString())
      .lte("start_time", horizon)
      .order("start_time", { ascending: true })

    if (!events?.length) continue

    const lines = events.slice(0, 4).map((e) => {
      const when = e.is_all_day ? "Todo el día" : timeFmt.format(new Date(e.start_time))
      return `${when} ${e.title}`
    })
    const extra = events.length > 4 ? ` +${events.length - 4} más` : ""
    const body = lines.join(" · ") + extra
    const title = `Hoy: ${events.length} ${events.length === 1 ? "evento" : "eventos"}`

    for (const sub of userSubs) {
      const res = await sendPush(sub, { title, body, url: "/agenda" })
      if (res === "ok") sent++
      else if (res === "gone") {
        await admin.from("agenda_push_subscriptions").delete().eq("endpoint", sub.endpoint)
      }
    }
  }

  return NextResponse.json({ ok: true, sent, at: now.toISOString() })
}
