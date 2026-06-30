import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';

/**
 * Request-scoped server-side Supabase client bound to the current request's
 * auth cookies (@supabase/ssr). Reads the session that `createBrowserClient`
 * (`supabaseClient.ts`) persists to cookies.
 *
 * Distinct from `supabaseServer.ts` — that is a stateless anon `createClient`
 * for public-data route handlers and does NOT read auth cookies. Do not merge
 * the two: this one is auth-scoped, that one is intentionally session-less.
 *
 * RSC note: Server Components can READ cookies but cannot SET them. The
 * middleware (`supabaseMiddleware.ts`) already refreshes the token on every
 * request, so the `setAll` no-op (try/catch) here is the documented
 * @supabase/ssr pattern — the refreshed cookie is written by the middleware,
 * not by this read-only RSC client.
 */
async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component (read-only cookies). Safe to
            // ignore: the middleware refreshes the session cookie on every
            // request. Documented @supabase/ssr RSC behavior.
          }
        },
      },
    },
  );
}

/**
 * Returns the authenticated user for SSR seeding, or `null` when logged out /
 * on any failure (fail-safe → client-side auth flow takes over unchanged).
 *
 * Uses `getUser()` (validates the JWT against the Supabase Auth server), NOT
 * `getSession()` (which would trust the cookie without validation — §3). The
 * returned `User` carries only the profile (id/email/metadata); access/refresh
 * tokens stay in the httpOnly cookie and are never serialized into the HTML.
 */
export async function getServerUser(): Promise<User | null> {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  } catch {
    return null;
  }
}
