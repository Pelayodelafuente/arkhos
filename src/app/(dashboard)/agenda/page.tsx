import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CronosView } from "./_components/CronosView"
import type { AgendaEvent } from "@/types/agenda"

const EVENT_FIELDS = [
  "id", "user_id", "title", "description", "start_time", "end_time",
  "is_all_day", "location", "color", "recurrence_rule", "reminders",
  "source", "linked_task_id", "completed", "metadata", "created_at", "updated_at",
].join(", ")

export default async function AgendaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Rango inicial: mes anterior → dos meses adelante (margen para navegar sin refetch)
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString()

  const { data: eventsRaw } = await supabase
    .from("agenda_events")
    .select(EVENT_FIELDS)
    .eq("user_id", user.id)
    .or(`and(start_time.lte.${end},end_time.gte.${start}),recurrence_rule.not.is.null`)
    .order("start_time", { ascending: true })

  return (
    <CronosView initialEvents={(eventsRaw ?? []) as unknown as AgendaEvent[]} userId={user.id} />
  )
}
