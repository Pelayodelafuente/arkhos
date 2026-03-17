import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ExpensesView } from "@/components/modules/expenses"

export default async function GastosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return <ExpensesView userId={user.id} />
}
