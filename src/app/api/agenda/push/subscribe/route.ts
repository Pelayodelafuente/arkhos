import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod/v4"

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  device: z.string().max(120).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })

  const { endpoint, keys, device } = parsed.data
  const { error } = await supabase.from("agenda_push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      device: device ?? null,
    },
    { onConflict: "endpoint" }
  )
  if (error) return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  const endpoint = (raw as { endpoint?: string }).endpoint
  if (!endpoint) return NextResponse.json({ error: "Falta endpoint" }, { status: 400 })

  await supabase
    .from("agenda_push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint)
  return NextResponse.json({ ok: true })
}
