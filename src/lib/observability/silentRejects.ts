import { captureError } from './captureError';

/**
 * Logs rejected entries of a Promise.allSettled result to console (dev) + Sentry (prod).
 *
 * Slice 176: Delegates to unified captureError wrapper — inherits DomainError-code
 * tag-extraction + normalization via toDomainError (174).
 *
 * Usage after a Promise.allSettled where graceful-degrade is intended:
 *   const results = await Promise.allSettled([q1, q2, q3]);
 *   logSilentRejects('myModule.myFunction', results);
 *
 * Does NOT change fulfilled/rejected routing — pure observation.
 * Sentry.captureException is no-op in dev (enabled: production only in sentry.*.config.ts).
 */
export function logSilentRejects(
  label: string,
  results: ReadonlyArray<PromiseSettledResult<unknown>>
): void {
  for (let idx = 0; idx < results.length; idx++) {
    const r = results[idx];
    if (r.status !== 'rejected') continue;
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[silentReject] ${label}[${idx}]:`, r.reason);
    }
    captureError(r.reason, {
      feature: 'silentReject',
      extra: { label, index: idx, totalResults: results.length },
    });
  }
}

/**
 * Logs a caught error to console (dev) + Sentry (prod) while keeping graceful-degrade
 * behavior intact. Use in `.catch()` handlers where a fallback value is returned.
 *
 * Slice 176: Delegates to unified captureError wrapper.
 *
 * Usage:
 *   getClubBySlug(slug, userId).catch((err) => {
 *     logSilentCatch('useCommunityData.getClubBySlug', err);
 *     return null;
 *   });
 *
 * Pure observation — caller decides fallback value.
 */
export function logSilentCatch(
  label: string,
  err: unknown,
  context?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[silentCatch] ${label}:`, err);
  }
  captureError(err, {
    feature: 'silentCatch',
    extra: { label, ...(context ?? {}) },
  });
}
