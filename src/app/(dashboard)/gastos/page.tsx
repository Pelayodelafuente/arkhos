import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ExpensesView } from "@/components/modules/expenses"
import {
  getSubscriptions,
  getExpenseCategories,
  getUserGastosSettings,
  getPayments,
  getMonthlySpending,
} from "@/lib/supabase/expenses"
import type { ExpensesSnapshot } from "@/types/expenses"

export default async function GastosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Snapshot inicial server-side: el HTML llega con datos pintados.
  // Si alguna lectura falla, se degrada al fetch cliente de siempre.
  let initialData: ExpensesSnapshot | null = null
  try {
    const [subscriptions, categories, settings, payments, monthlySpending] =
      await Promise.all([
        getSubscriptions(user.id, supabase),
        getExpenseCategories(user.id, supabase),
        getUserGastosSettings(user.id, supabase),
        getPayments(user.id, undefined, undefined, supabase),
        getMonthlySpending(user.id, 6, supabase),
      ])
    initialData = { subscriptions, categories, settings, payments, monthlySpending }
  } catch {
    initialData = null
  }

  return <ExpensesView userId={user.id} initialData={initialData} />
}
