import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./types"

/**
 * Cliente Supabase con service_role (bypassa RLS). SOLO en código server-side
 * de confianza: feed ICS validado por token y crons. Nunca exponer al cliente.
 * Devuelve null si falta la key (fail-closed en el llamador).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
