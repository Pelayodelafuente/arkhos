import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAggregatedItems } from "@/lib/agenda/aggregate"
import { buildCalendar } from "@/lib/agenda/ics"
import type { AgendaEvent } from "@/types/agenda"

const EVENT_FIELDS =
  "id, user_id, title, description, start_time, end_time, is_all_day, location, color, recurrence_rule, reminders, source, linked_task_id, completed, metadata, created_at, updated_at"

// Feed ICS público validado por token secreto (no por sesión). Lo suscribe Proton.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  if (!token || token.length < 16) {
    return new NextResponse("Token inválido", { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) return new NextResponse("Feed no configurado", { status: 503 })

  const { data: tokenRow } = await admin
    .from("agenda_feed_tokens")
    .select("user_id")
    .eq("token", token)
    .maybeSingle()
  if (!tokenRow) return new NextResponse("No encontrado", { status: 404 })

  const userId = tokenRow.user_id

  const now = new Date()
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 6, 0, 23, 59, 59).toISOString()

  const [{ data: events }, aggregated] = await Promise.all([
    admin.from("agenda_events").select(EVENT_FIELDS).eq("user_id", userId),
    getAggregatedItems(admin, userId, rangeStart, rangeEnd),
  ])

  const ics = buildCalendar((events ?? []) as unknown as AgendaEvent[], aggregated)

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="cronos.ics"',
      "Cache-Control": "public, max-age=900",
    },
  })
}
