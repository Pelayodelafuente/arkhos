import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NotesView } from "@/components/modules/notes"

export default async function NotasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return <NotesView userId={user.id} />
}
