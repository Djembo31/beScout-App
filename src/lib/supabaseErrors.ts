/**
 * Supabase error classification helpers.
 *
 * Distinguishes expected transient failures (fetch aborts from page
 * navigation, offline hiccups) from real API errors so that monitoring
 * only fires on actual problems.
 */

/**
 * True if the error looks like a browser fetch abort — usually triggered by
 * the user navigating away while layout queries are still in flight, or by
 * a transient connectivity blip.
 *
 * Chromium raises `TypeError: Failed to fetch` for these cases; other
 * runtimes may use `NetworkError` or `ERR_NETWORK`. All three collapse into
 * the same "not a real API failure" bucket.
 */
export function isFetchAbort(error: unknown): boolean {
  if (!error) return false;
  const err = error as { message?: unknown; details?: unknown };
  const text = `${String(err.message ?? '')} ${String(err.details ?? '')}`;
  return (
    text.includes('Failed to fetch') ||
    text.includes('NetworkError') ||
    text.includes('ERR_NETWORK') ||
    text.includes('network request failed')
  );
}

/**
 * Log a Supabase call failure at the appropriate severity:
 *   - `console.warn` for expected transients (navigation abort, offline)
 *   - `console.error` for real API failures (RLS, RPC bug, 500, etc.)
 *
 * Use at the boundary where the caller would otherwise hard-log the error
 * but has a graceful fallback (return null, [], default, etc.).
 */
export function logSupabaseError(prefix: string, error: unknown): void {
  if (isFetchAbort(error)) {
    console.warn(`${prefix} (transient, likely navigation abort):`, error);
  } else {
    console.error(prefix, error);
  }
}
