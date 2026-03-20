import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NotesView } from "@/components/modules/notes"
import type { Note, NoteCanvas } from "@/types/notes"

export default async function NotasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch notes
  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false })

  // Get or create default canvas
  let canvas: NoteCanvas | null = null
  const { data: existingCanvas } = await supabase
    .from("note_canvases")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_default", true)
    .single()

  if (existingCanvas) {
    canvas = existingCanvas as NoteCanvas
  } else {
    const { data: newCanvas } = await supabase
      .from("note_canvases")
      .insert({ user_id: user.id, name: "Mi Canvas", is_default: true })
      .select()
      .single()
    canvas = newCanvas as NoteCanvas
  }

  return (
    <NotesView
      initialNotes={(notes ?? []) as Note[]}
      initialCanvas={canvas!}
      userId={user.id}
    />
  )
}
