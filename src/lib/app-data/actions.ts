"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAppData, type AppData } from "./get-app-data"

/**
 * Server Action que dispara la megacarga única al login: resuelve la sesión
 * actual y agrega los 6 módulos (Dashboard, Proyectos, Gastos, Notas,
 * Patrimonio, Mercados) en una sola llamada. La llama `AppDataLoader`
 * (fase posterior) al montar `(dashboard)/layout.tsx`.
 */
export async function loadAppData(): Promise<AppData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return getAppData(supabase, user.id)
}
