import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NotesView } from "@/components/modules/notes"
import type { Note, NoteCanvas } from "@/types/notes"
import { NOTES_PAGE_SIZE } from "@/lib/supabase/notes"

const NOTE_LIST_FIELDS = [
  'id', 'user_id', 'title', 'color', 'icon', 'is_pinned',
  'word_count', 'tags', 'sort_order', 'folder_id', 'archived',
  'favorited', 'deleted_at', 'status', 'project_id', 'subscription_id',
  'created_at', 'updated_at',
].join(', ')

export default async function NotasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch primera página de notas sin content (lazy load)
  const { data: notesRaw } = await supabase
    .from("notes")
    .select(NOTE_LIST_FIELDS)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .range(0, NOTES_PAGE_SIZE - 1)

  const notes = ((notesRaw ?? []) as unknown as Record<string, unknown>[]).map((n) => ({ ...n, content: '', contentLoaded: false })) as Note[]

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
