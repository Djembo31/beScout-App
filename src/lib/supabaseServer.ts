import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Server-side Supabase client for API Route Handlers (public data only).
 *  Lazy-initialized to avoid build-time crashes when env vars aren't available. */
let _client: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _client;
}

/** @deprecated Use getSupabaseServer() instead */
export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseServer() as unknown as Record<string, unknown>)[prop as string];
  },
});
