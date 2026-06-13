import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { configureWebPush, sendPush, type PushSub } from "@/lib/agenda/push"

export const maxDuration = 60

// Ventana de disparo: debe coincidir con la cadencia del cron (ver vercel.json).
const WINDOW_MIN = 15

// Cron de recordatorios Web Push. Vercel envía Authorization: Bearer ${CRON_SECRET}.
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

  const now = Date.now()
  const lower = now - WINDOW_MIN * 60000
  const horizon = new Date(now + 24 * 60 * 60 * 1000).toISOString()

  // Suscripciones agrupadas por usuario
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
    // Eventos próximos no recurrentes con recordatorio (las recurrencias se omiten en v1)
    const { data: events } = await admin
      .from("agenda_events")
      .select("title, start_time, reminders")
      .eq("user_id", userId)
      .is("recurrence_rule", null)
      .gte("start_time", new Date(now).toISOString())
      .lte("start_time", horizon)

    for (const ev of events ?? []) {
      const startMs = new Date(ev.start_time).getTime()
      const fires = (ev.reminders ?? []).some((r) => {
        const fireAt = startMs - r * 60000
        return fireAt > lower && fireAt <= now
      })
      if (!fires) continue

      const minutes = Math.round((startMs - now) / 60000)
      const body =
        minutes <= 1 ? "Empieza ahora" : minutes < 60 ? `Empieza en ${minutes} min` : "Próximamente"

      for (const sub of userSubs) {
        const res = await sendPush(sub, { title: ev.title, body, url: "/agenda" })
        if (res === "ok") sent++
        else if (res === "gone") {
          await admin.from("agenda_push_subscriptions").delete().eq("endpoint", sub.endpoint)
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent, at: new Date().toISOString() })
}
