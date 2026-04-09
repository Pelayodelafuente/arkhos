import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (!_client) {
    _client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

/**
 * Untyped client for tables not yet reflected in types.ts
 * (pending `supabase gen types typescript` regeneration after migrations 009-021).
 * Use only in data-layer files where the Database type is incomplete.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createUntypedClient = (): any => createClient();
